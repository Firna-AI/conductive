import type { AgentLogin } from './login-kind'
import { runnerSupportsLogin } from '../../src/shared/runner'
import { RunnerAccessDenied, SenderAccessDenied } from './login-access'
import { ChatOperation } from './operation'
import { commandDispatchState, type DispatchResult } from './ordered-dispatch'
import { compatibilityFailure } from './runner-gateway-command'
import { failCommandLogin } from './runner-login-failure'
import type { ChatStore } from './store'
import type {
  ActiveRunner,
  ChatDependencies,
  PendingCommand,
  PreparedCommand,
} from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

export class RunnerCommandPreparation {
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
  }

  async prepare(
    active: ActiveRunner,
    command: PendingCommand,
  ): Promise<DispatchResult<PreparedCommand>> {
    const state = await this.store.read(active.workspace.id, (view) =>
      commandDispatchState(view, command),
    )
    if (state !== 'send') return { state }
    if (command.type === 'interrupt' || command.type === 'model')
      return { state: 'send', command }
    const message = await this.store.read(active.workspace.id, (view) =>
      view.message(command.messageId),
    )
    if (!message) return { state: 'skip' }
    let login: AgentLogin | null
    try {
      const operation = new ChatOperation(
        this.store,
        active.workspace.id,
        this.dependencies,
        this.publish,
      )
      const observed = await operation.logins.observe(
        command.sessionId,
        active.workspace.tokenHash,
        message.sender.id,
      )
      login = observed.login
      if (!login && observed.reason) {
        await this.failLogin(active.workspace.id, command, observed.reason)
        return this.unavailable(active.workspace.id, command)
      }
    } catch (error) {
      if (!(error instanceof SenderAccessDenied)) throw error
      await this.failLogin(active.workspace.id, command, error.message)
      return this.unavailable(active.workspace.id, command)
    }
    if (!login || login.agent !== message.choice.agent) {
      await this.failLogin(active.workspace.id, command)
      return this.unavailable(active.workspace.id, command)
    }
    if (
      !runnerSupportsLogin(
        login.kind === 'endpoint'
          ? { agent: login.agent, kind: 'api-key' }
          : login,
        active.loginKinds,
      )
    ) {
      await this.failLogin(
        active.workspace.id,
        command,
        compatibilityFailure(login),
        'immediate',
      )
      return this.unavailable(active.workspace.id, command)
    }
    const branches = await this.dependencies.readBranches(active.workspace.id)
    if (!branches) throw new RunnerAccessDenied()
    const fields = {
      commandId: command.commandId,
      sessionId: command.sessionId,
      turnId: command.turnId,
      message: { ...message, state: 'sent' as const },
      attachments: command.attachments,
      login,
      branches,
    }
    if (command.type === 'message')
      return { state: 'send', command: { type: 'message', ...fields } }
    const turn = await this.store.read(active.workspace.id, (view) =>
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
