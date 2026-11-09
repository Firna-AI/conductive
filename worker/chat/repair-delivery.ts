import type { WorkspaceEventEnvelope } from './workspace-events'
import type { ChatStore } from './store'
import type { ActiveRunner } from './types'

/** Report delivery uses the authenticated stream and does not need an agent login. */
export class RepairDelivery {
  private readonly store: ChatStore
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.store = store
    this.publish = publish
  }

  async flush(active: ActiveRunner): Promise<void> {
    if (!active.streamId) return
    const repairs = await this.store.read(active.workspace.id, (view) =>
      view.repairs.all(),
    )
    for (const repair of repairs) {
      if (
        repair.state === 'failed' ||
        active.delivered.has(repair.command.commandId)
      )
        continue
      await active.peer.send(repair.command)
      active.delivered.add(repair.command.commandId)
      if (repair.sent) continue
      await this.store.change(
        active.workspace.id,
        async (transaction) => {
          const current = await transaction.repairs.get(repair.command.kind)
          if (current?.command.commandId === repair.command.commandId) {
            current.sent = true
            await transaction.repairs.save(current)
          }
        },
        this.publish,
      )
    }
  }
}
