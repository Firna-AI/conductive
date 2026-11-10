import type { WorkspaceEventEnvelope } from './workspace-events'
import { markSent } from './messages'
import type { ChatStore } from './store'
import type { PendingCommand } from './types'

/** A login check precedes this commit. The transport send follows it. */
export class DeliveryState {
  private readonly store: ChatStore
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.store = store
    this.publish = publish
  }

  begin(workspaceId: string, command: PendingCommand): Promise<boolean> {
    return this.store.change(
      workspaceId,
      async (transaction) => {
        if (command.type !== 'turn') return false
        const turn = await transaction.turn(command.turnId)
        if (!turn || turn.state !== 'queued') return false
        turn.state = 'running'
        turn.started = true
        turn.startedAt = transaction.now
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

  sent(workspaceId: string, command: PendingCommand): Promise<void> {
    return this.store.change(
      workspaceId,
      async (transaction) => {
        if (command.type === 'turn' || command.type === 'message') {
          const turn = await transaction.turn(command.turnId)
          if (turn) await markSent(transaction, turn, command.messageId)
        }
      },
      this.publish,
    )
  }
}
