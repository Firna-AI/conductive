import type { AppDependencies, AppEnv } from '../env'
import {
  beginBackgroundAttempt,
  failBackgroundAttempt,
} from './background-retry-alarm'
import { retrySandboxCleanup } from './cleanup'
import type { WorkspaceStorage } from './platform-storage'
import { retryAllocationCleanup } from './start-allocation-cleanup'

const RETRY_KEY = 'lifecycle:cleanup-retry'

export async function advanceWorkspaceCleanup(
  storage: WorkspaceStorage,
  env: AppEnv,
  dependencies: AppDependencies,
  cleanupId: string,
): Promise<void> {
  const attempt = await beginBackgroundAttempt(
    storage,
    RETRY_KEY,
    dependencies.now(),
  )
  if (!attempt.ready) return
  try {
    if (
      (await retryAllocationCleanup(storage, env, dependencies)) &&
      (await retrySandboxCleanup(env, dependencies, cleanupId))
    ) {
      await storage.transaction(async (transaction) => {
        await transaction.delete(['lifecycle:cleanup', RETRY_KEY])
        await transaction.deleteAlarm()
      })
    }
  } catch (error) {
    await failBackgroundAttempt(
      storage,
      RETRY_KEY,
      attempt.retry,
      error,
      dependencies.now(),
    )
  }
}
