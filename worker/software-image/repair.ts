import { latestSoftwareRelease } from '../lifecycle/software-release'
import { warnWorker } from '../warnings'
import { advanceSoftwareImage } from './build'
import { cleanupOldSoftwareImages } from './cleanup'
import { softwareImageAccounts, softwareImages } from './data'
import { cleanupSoftwareImageProgress } from './deploy-data'
import type { SoftwareImageRuntime } from './types'
import { softwareVersion } from './version'

export async function repairSoftwareImages(
  runtime: SoftwareImageRuntime,
): Promise<void> {
  let currentVersion: string | null = null
  try {
    currentVersion = await softwareVersion(
      await latestSoftwareRelease(runtime.env, runtime.dependencies.fetch),
    )
  } catch {
    warnWorker({ kind: 'software_image_repair_failed' })
  }
  for (const account of await softwareImageAccounts(runtime.env.DB)) {
    for (const image of await softwareImages(runtime.env.DB, account)) {
      if (image.phase === 'done' && image.state !== 'deleting') continue
      try {
        await advanceSoftwareImage(runtime, image.id)
      } catch {
        warnWorker({ kind: 'software_image_repair_failed' })
      }
    }
    await cleanupOldSoftwareImages(runtime, account, currentVersion)
  }
  await cleanupSoftwareImageProgress(runtime.env.DB, runtime.dependencies.now())
}
