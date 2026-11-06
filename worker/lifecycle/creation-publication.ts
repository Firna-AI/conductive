import type { AppEnv } from '../env'
import type { StartJobStorage } from './start-types'
import {
  completeCreationAttempt,
  markCreationFailed,
} from './creation-attempt-data'

/** The native outcome commits first. D1 publication can then retry without changing it. */
export async function publishCreationResult(
  env: AppEnv,
  storage: StartJobStorage,
): Promise<boolean> {
  const record = await storage.publication()
  if (!record) return true
  try {
    if (record.state === 'succeeded')
      await completeCreationAttempt(env.DB, record.workspaceId)
    else await markCreationFailed(env.DB, record.workspaceId)
    await storage.clearPublication()
    return true
  } catch {
    await storage.schedule()
    return false
  }
}
