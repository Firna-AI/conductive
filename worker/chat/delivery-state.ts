import type { WorkspaceEventEnvelope } from './workspace-events'
import { markSent } from './messages'
import type { ChatStore } from './store'
import type { ResolvedCommand, ChatDependencies, PendingCommand } from './types'

/** A login check precedes this commit. The transport send follows it. */
export class DeliveryState {
  private readonly store: ChatStore
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void
  private readonly dependencies: ChatDependencies

  constructor(
    store: ChatStore,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    dependencies: ChatDependencies,
  ) {
    this.store = store
    this.publish = publish
    this.dependencies = dependencies
  }

  begin(
    workspaceId: string,
    command: PendingCommand,
    outbound: ResolvedCommand,
  ): Promise<boolean> {
    return this.store.change(
      workspaceId,
      async (transaction) => {
        if (command.type !== 'turn' || outbound.type !== 'turn') return false
        const turn = await transaction.turn(command.turnId)
        if (!turn || turn.state !== 'queued') return false
        turn.state = 'running'
        turn.started = true
        turn.startedAt = transaction.now
        if (outbound.login.kind === 'endpoint')
          turn.endpointModel = outbound.message.choice.model
        else delete turn.endpointModel
        await transaction.saveTurn(turn)
        return true
      },
      this.publish,
    )
  }

  async unsent(
    workspaceId: string,
    command: PendingCommand,
    beganTurn: boolean,
  ): Promise<void> {
    if (!beganTurn || !('turnId' in command)) return
    await this.store.change(
      workspaceId,
      async (transaction) => {
        const turn = await transaction.turn(command.turnId)
        if (turn?.state === 'running') {
          turn.state = 'queued'
          turn.started = false
          delete turn.startedAt
          await transaction.saveTurn(turn)
        }
      },
      this.publish,
    )
  }

  async sent(
    workspaceId: string,
    command: PendingCommand,
    connectionId: string,
  ): Promise<void> {
    const refresh = await this.store.change(
      workspaceId,
      async (transaction) => {
        await transaction.saveCommandDelivery(command.commandId, connectionId)
        if (command.type === 'model' && command.choice.agent === 'claude') {
          const session = await transaction.session(command.sessionId)
          const turn = session?.activeTurnId
            ? await transaction.turn(session.activeTurnId)
            : undefined
          if (turn?.endpointModel) {
            turn.endpointModel = command.choice.model
            await transaction.saveTurn(turn)
          }
        }
        if (command.type === 'turn' || command.type === 'message') {
          const turn = await transaction.turn(command.turnId)
          if (turn) await markSent(transaction, turn, command.messageId)
          if (command.type === 'turn' && turn?.endpointModel) {
            const session = await transaction.session(turn.sessionId)
            if (session?.startedBy)
              return {
                userId: session.startedBy.id,
                agent: session.choice.agent,
              }
          }
        }
      },
      this.publish,
    )
    if (refresh)
      this.dependencies.waitUntil(
        this.dependencies.refreshEndpointModels(refresh.userId, refresh.agent),
      )
  }
}
