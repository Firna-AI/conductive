import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { ChatStore, ChatTransaction } from './store'

export interface WorkspaceOperation {
  change<T>(work: (transaction: ChatTransaction) => Promise<T>): Promise<T>
  publish(envelope: WorkspaceEventEnvelope): void
}

/** The supplied operations already run in the queue. They must not enter it again. */
export function runWorkspaceOperation<T>(
  store: ChatStore,
  workspaceId: string,
  authorize: () => Promise<void>,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  work: (operation: WorkspaceOperation) => Promise<T>,
): Promise<T> {
  return store.run(async () => {
    await authorize()
    return work({
      change: (action) => store.change(workspaceId, action, publish),
      publish: (envelope) => publish([envelope]),
    })
  })
}
