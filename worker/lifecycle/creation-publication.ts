import type { AppEnv } from '../env'
import type { StartJobStorage } from './start-types'
import {
  completeCreationAttempt,
  markCreationFailed,
} from './creation-attempt-data'
import { cleanupImportWork } from '../conductor-import/cleanup'

/** The native outcome commits first. D1 publication can then retry without changing it. */
export async function publishCreationResult(
  env: AppEnv,
  storage: StartJobStorage,
): Promise<boolean> {
  const cleanup = await storage.activationCleanup()
  if (cleanup) {
    try {
      await cleanupImportWork(env, cleanup.orgId, cleanup.workspaceId)
      await storage.clearActivationCleanup()
    } catch {
      await storage.schedulePublication()
      return false
    }
  }
  const record = await storage.publication()
  if (!record) {
    await storage.clearPublication()
    return true
  }
  try {
    if (record.state === 'succeeded')
      await completeCreationAttempt(env.DB, record.workspaceId)
    else await markCreationFailed(env.DB, record.workspaceId)
    await storage.clearPublication()
    return true
  } catch {
    await storage.schedulePublication()
    return false
  }
}
