import type { WorkspaceEventEnvelope } from './workspace-events'
import type { ChatStore, ChatTransaction } from './store'

export interface WorkspaceOperation {
  change<T>(work: (transaction: ChatTransaction) => Promise<T>): Promise<T>
  publish(envelope: WorkspaceEventEnvelope): void
}

/** Binds each feature operation before it enters the shared workspace queue. */
export function workspaceOperationRunner(
  store: ChatStore,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  bind: (workspaceId: string) => void,
) {
  return <T>(
    workspaceId: string,
    authorize: () => Promise<void>,
    work: (operation: WorkspaceOperation) => Promise<T>,
  ): Promise<T> => {
    bind(workspaceId)
    return runWorkspaceOperation(store, workspaceId, authorize, publish, work)
  }
}

/** The supplied operations already run in the queue. They must not enter it again. */
function runWorkspaceOperation<T>(
  store: ChatStore,
  workspaceId: string,
  authorize: () => Promise<void>,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  work: (operation: WorkspaceOperation) => Promise<T>,
): Promise<T> {
  return store.run(async () => {
    await authorize()
    // Replays publish synchronously, so their labels must be ready before work.
    const preparation = store.eventLabels(workspaceId)
    const labels = await preparation.prepare()
    return work({
      change: (action) =>
        store.change(workspaceId, action, publish, preparation),
      publish: (envelope) => publish([labels.envelope(envelope)]),
    })
  })
}
