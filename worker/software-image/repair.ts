import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { captureWorkerWarning } from '../error-reporting/policy'
import { warnWorker } from '../warnings'
import { advanceSoftwareImage } from './build'
import { cleanupOldSoftwareImages } from './cleanup'
import { softwareImages } from './data'
import type { SoftwareImageRuntime } from './types'

export async function repairSoftwareImages(
  runtime: SoftwareImageRuntime,
): Promise<void> {
  for (const image of await softwareImages(
    runtime.env.DB,
    DEFAULT_PROVIDER_ACCOUNT,
  )) {
    if (image.phase === 'done' && image.state !== 'deleting') continue
    try {
      await advanceSoftwareImage(runtime, image.id)
    } catch (error) {
      const warning = { kind: 'software_image_repair_failed' } as const
      warnWorker(warning)
      captureWorkerWarning(warning, error)
    }
  }
  await cleanupOldSoftwareImages(runtime, DEFAULT_PROVIDER_ACCOUNT)
}
