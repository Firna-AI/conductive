import type { AppEnv } from '../env'
import { durableStartStorage } from './start-storage'
import type { StartJobStorage } from './start-types'
import type { WorkspacePlatform } from './workspace-platform'

/**
 * The start storage of a workspace object. Each begin, phase change, and
 * end of its job also records the phase steps of the job.
 */
export function startJobStorage(
  platform: WorkspacePlatform,
  now: () => number,
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
): StartJobStorage {
  const storage = durableStartStorage(platform.storage, now, env)
  const records = platform.startRecords
  if (!records) return storage
  return {
    ...storage,
    begin: async (job, epoch, intent) => {
      const begun = await storage.begin(job, epoch, intent)
      if (begun) await records.jobBegan(job)
      return begun
    },
    update: async (job) => {
      const before = await storage.job()
      await storage.update(job)
      if (before) await records.phaseChanged(before, job)
    },
    complete: async (attempt, result) => {
      const before = await storage.job()
      await storage.complete(attempt, result)
      if (before?.attempt === attempt && !(await storage.job()))
        await records.jobEnded(before, result.ok ? 'done' : 'failed')
    },
  }
}
