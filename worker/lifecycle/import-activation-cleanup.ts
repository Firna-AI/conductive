import type { WorkspaceStorage } from './platform-storage'
import type { StartJobStorage } from './start-types'

export const IMPORT_CHECKPOINT_KEY = 'lifecycle:import-checkpoint'

export function activationCleanupStorage(
  storage: WorkspaceStorage,
): Pick<StartJobStorage, 'activationCleanup' | 'clearActivationCleanup'> {
  return {
    activationCleanup: async () => {
      const checkpoint = await storage.get('job', IMPORT_CHECKPOINT_KEY)
      return checkpoint?.kind === 'activate' &&
        checkpoint.activation.cleanupPending
        ? { orgId: checkpoint.orgId, workspaceId: checkpoint.workspaceId }
        : undefined
    },
    clearActivationCleanup: async () => {
      await storage.transaction(async (transaction) => {
        const checkpoint = await transaction.get('job', IMPORT_CHECKPOINT_KEY)
        if (checkpoint?.kind === 'activate')
          await transaction.put('job', IMPORT_CHECKPOINT_KEY, {
            ...checkpoint,
            activation: { ...checkpoint.activation, cleanupPending: false },
          })
      })
    },
  }
}
