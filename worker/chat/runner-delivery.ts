import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { RunnerCommand } from '../../src/shared/runner'
import { markSent } from './messages'
import type { ChatStore, ChatTransaction } from './store'
import { storeAgentEvent } from './turn-events'
import { TurnLifecycle } from './turn-lifecycle'
import type { ActiveRunner, ChatDependencies, PendingCommand } from './types'

export class RunnerDelivery {
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

  /** Called inside the store's serial queue, after the request commits. */
  async flush(
    active: ActiveRunner,
    isCurrent: () => boolean,
    detach: () => void,
  ): Promise<void> {
    if (!active.ready) return
    while (await this.flushPending(active, isCurrent, detach)) {
      if (!isCurrent()) return
    }
  }

  private async flushPending(
    active: ActiveRunner,
    isCurrent: () => boolean,
    detach: () => void,
  ): Promise<boolean> {
    let advanced = false
    const pending = await this.store.read(active.workspace.id, (view) =>
      view.pending(),
    )
    for (const command of pending) {
      if (!isCurrent() || active.delivered.has(command.commandId)) continue
      const current = await this.store.read(active.workspace.id, (view) =>
        view.command(command.commandId),
      )
      if (!current) continue
      const outbound = await this.command(active, command)
      if (!outbound) {
        if (
          !(await this.store.read(active.workspace.id, (view) =>
            view.command(command.commandId),
          ))
        )
          advanced = true
        continue
      }
      try {
        active.peer.send(outbound)
      } catch {
        detach()
        return false
      }
      active.delivered.add(command.commandId)
      await this.store.change(
        active.workspace.id,
        async (transaction) => {
          if (command.type === 'turn' || command.type === 'message') {
            const turn = await transaction.turn(command.turnId)
            if (turn) {
              if (turn.state === 'queued') turn.state = 'running'
              await transaction.saveTurn(turn)
              await markSent(transaction, turn, command.messageId)
            }
          }
        },
        this.publish,
      )
    }
    return advanced
  }

  private async command(
    active: ActiveRunner,
    command: PendingCommand,
  ): Promise<RunnerCommand | null> {
    if (command.type === 'model') return command
    const canDispatch = await this.store.read(
      active.workspace.id,
      async (view) => {
        const session = await view.session(command.sessionId)
        return session
          ? new TurnLifecycle(view, session).canDispatch(command)
          : false
      },
    )
    if (!canDispatch) return null
    if (command.type === 'interrupt') return command
    const message = await this.store.read(active.workspace.id, (view) =>
      view.message(command.messageId),
    )
    if (!message) return null
    const login = await this.dependencies.resolveLogin(
      message.sender.id,
      message.choice.agent,
    )
    if (!login || login.agent !== message.choice.agent) {
      await this.failLogin(active.workspace.id, command)
      return null
    }
    return {
      type: command.type,
      commandId: command.commandId,
      sessionId: command.sessionId,
      turnId: command.turnId,
      message: { ...message, state: 'sent' },
      attachments: command.attachments,
      login,
    }
  }

  private async failLogin(
    workspaceId: string,
    command: Extract<PendingCommand, { messageId: string }>,
  ): Promise<void> {
    await this.store.change(
      workspaceId,
      async (transaction: ChatTransaction) => {
        const turn = await transaction.turn(command.turnId)
        if (!turn || turn.state !== 'queued') return
        await storeAgentEvent(
          transaction,
          {
            type: 'turn.failed',
            sessionId: command.sessionId,
            turnId: command.turnId,
            error: {
              code: 'agent_login_required',
              message: 'Connect your agent login and try again.',
            },
            retryMessageId: command.messageId,
            durationMs: 0,
          },
          transaction.now,
          this.dependencies.randomId,
        )
      },
      this.publish,
    )
  }
}
