import { capabilityChangeText } from '../../src/shared/capability-change'
import type { AgentLogin } from './login-kind'
import { runnerSupportsLogin } from '../../src/shared/runner'
import { RunnerAccessDenied, SenderAccessDenied } from './login-access'
import { ChatOperation } from './operation'
import { commandDispatchState, type DispatchResult } from './ordered-dispatch'
import { compatibilityFailure } from './runner-gateway-command'
import { failCommandLogin } from './runner-login-failure'
import {
  failRepositoryTurn,
  type RepositoryMoves,
} from './runner-repository-move'
import type { ChatStore } from './store'
import type {
  ActiveRunner,
  ChatDependencies,
  PreparedCommand,
  ResolvedCommand,
} from './types'
import type { PendingCommand } from './pending-command'
import type { WorkspaceEventEnvelope } from './workspace-events'

export class RunnerCommandPreparation {
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void
  private readonly moves: RepositoryMoves

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    moves: RepositoryMoves,
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.moves = moves
  }

  async prepare(
    active: ActiveRunner,
    command: PendingCommand,
  ): Promise<DispatchResult<PreparedCommand>> {
    const state = await this.store.read(active.state.workspace.id, (view) =>
      commandDispatchState(view, command),
    )
    if (state !== 'send') return { state }
    if (command.type === 'notice' && active.state.capabilityNotices !== true)
      return { state: 'wait' }
    if (command.type === 'notice') {
      const waiting = await this.store.read(active.state.workspace.id, (view) =>
        view.capabilityNotes.waiting(command.sessionId),
      )
      const notices = waiting
        .filter(
          (note) =>
            command.noticeIds.includes(note.id) &&
            note.sentTurnId === command.turnId,
        )
        .map((note) => ({
          id: note.id,
          text: capabilityChangeText(note.member, note.changes),
        }))
      return notices.length
        ? {
            state: 'send',
            command: {
              type: 'notice',
              commandId: command.commandId,
              sessionId: command.sessionId,
              turnId: command.turnId,
              notices,
            },
          }
        : { state: 'skip' }
    }
    if (command.type === 'interrupt' || command.type === 'model')
      return { state: 'send', command }
    const message = await this.store.read(active.state.workspace.id, (view) =>
      view.message(command.messageId),
    )
    if (!message) return { state: 'skip' }
    const folder = await this.moves.check(active)
    if (folder.state === 'wait') return { state: 'wait' }
    if (folder.state === 'refused') {
      await failRepositoryTurn(
        this.store,
        this.publish,
        active.state.workspace.id,
        command.turnId,
      )
      return this.unavailable(active.state.workspace.id, command)
    }
    let login: AgentLogin | null
    try {
      const operation = new ChatOperation(
        this.store,
        active.state.workspace.id,
        this.dependencies,
        this.publish,
      )
      const observed = await operation.logins.observe(
        command.sessionId,
        active.state.workspace.tokenHash,
        message.sender.id,
      )
      login = observed.login
      if (!login && observed.reason) {
        await this.failLogin(
          active.state.workspace.id,
          command,
          observed.reason,
        )
        return this.unavailable(active.state.workspace.id, command)
      }
    } catch (error) {
      if (!(error instanceof SenderAccessDenied)) throw error
      await this.failLogin(active.state.workspace.id, command, error.message)
      return this.unavailable(active.state.workspace.id, command)
    }
    if (!login || login.agent !== message.choice.agent) {
      await this.failLogin(active.state.workspace.id, command)
      return this.unavailable(active.state.workspace.id, command)
    }
    if (
      !runnerSupportsLogin(
        login.kind === 'endpoint'
          ? { agent: login.agent, kind: 'api-key' }
          : login,
        active.state.loginKinds,
      )
    ) {
      await this.failLogin(
        active.state.workspace.id,
        command,
        compatibilityFailure(login),
        'immediate',
      )
      return this.unavailable(active.state.workspace.id, command)
    }
    const branches = await this.dependencies.readBranches(
      active.state.workspace.id,
    )
    if (!branches) throw new RunnerAccessDenied()
    const fields = {
      commandId: command.commandId,
      sessionId: command.sessionId,
      turnId: command.turnId,
      message: { ...message, state: 'sent' as const },
      attachments: command.attachments,
      login,
      branches,
      ...(folder.repository ? { repository: folder.repository } : {}),
    }
    if (command.type === 'message')
      return { state: 'send', command: { type: 'message', ...fields } }
    const turn = await this.store.read(active.state.workspace.id, (view) =>
      view.turn(command.turnId),
    )
    return {
      state: 'send',
      command: {
        type: 'turn',
        ...fields,
        commitAuthor: turn
          ? await this.dependencies.readCommitAuthor(turn.senderId)
          : null,
      },
    }
  }

  async prepareCapabilities(
    active: ActiveRunner,
    command: Extract<ResolvedCommand, { type: 'turn' }>,
  ): Promise<Extract<ResolvedCommand, { type: 'turn' }>> {
    const capabilities = await this.dependencies.readCapabilities(
      active.state.workspace.id,
      command.sessionId,
    )
    if (!capabilities) throw new RunnerAccessDenied()
    const notices = await this.store.change(
      active.state.workspace.id,
      async (view) => {
        if (active.state.capabilityNotices !== true) return []
        const steered = new Set(
          (await view.pending()).flatMap((pending) =>
            pending.type === 'notice' && pending.turnId === command.turnId
              ? pending.noticeIds
              : [],
          ),
        )
        return (
          await view.capabilityNotes.take(
            command.sessionId,
            command.turnId,
            (await view.turn(command.turnId))?.state === 'queued',
          )
        ).filter((notice) => !steered.has(notice.id))
      },
      this.publish,
    )
    return { ...command, capabilities, ...(notices.length ? { notices } : {}) }
  }

  private unavailable(
    workspaceId: string,
    command: PendingCommand,
  ): Promise<DispatchResult<PreparedCommand>> {
    return this.store.read(workspaceId, async (view) => ({
      state: (await view.command(command.commandId)) ? 'wait' : 'skip',
    }))
  }

  private failLogin(
    workspaceId: string,
    command: Extract<PendingCommand, { messageId: string }>,
    reason?: string,
    completion: 'after-runner' | 'immediate' = 'after-runner',
  ): Promise<void> {
    return failCommandLogin(
      this.store,
      this.dependencies,
      this.publish,
      workspaceId,
      command,
      reason,
      completion,
    )
  }
}
