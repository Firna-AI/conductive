import {
  deleteSandboxIfPresent,
  deleteSnapshotIfPresent,
} from '../lifecycle/cleanup'
import { providerForAccount } from '../sandbox/client'
import { warnWorker } from '../warnings'
import {
  claimSoftwareImageDeletion,
  deleteSoftwareImageRecord,
  readSoftwareImage,
  saveSoftwareImage,
  softwareImages,
} from './data'
import { allocateSoftwareImage, AttemptChanged } from './resources'
import type { SoftwareImage, SoftwareImageRuntime } from './types'

export async function cleanupSoftwareImage(
  runtime: SoftwareImageRuntime,
  image: SoftwareImage,
): Promise<void> {
  const { env, dependencies } = runtime
  const provider = providerForAccount(
    env,
    dependencies.fetch,
    image.providerAccount,
  )
  if (image.phase === 'allocating' && image.sandboxId === null) {
    const sandboxId = await allocateSoftwareImage(env.DB, provider, image)
    const current = await readSoftwareImage(env.DB, image.id)
    if (
      !current ||
      current.state !== image.state ||
      current.phase !== image.phase
    )
      throw new AttemptChanged()
    if (
      !(await saveSoftwareImage(env.DB, current, {
        sandboxId,
        phase: 'cleanup',
      }))
    )
      throw new AttemptChanged()
    image = {
      ...current,
      sandboxId,
      phase: 'cleanup',
      revision: current.revision + 1,
    }
  }
  if (image.sandboxId)
    await deleteSandboxIfPresent(
      env.DB,
      provider,
      { providerAccount: image.providerAccount, sandboxId: image.sandboxId },
      dependencies.now(),
    )
  if (image.state === 'failed' && image.snapshotRecorded)
    await deleteSnapshotIfPresent(provider, image.snapshotName)
  if (image.state === 'deleting') {
    await deleteSnapshotIfPresent(provider, image.snapshotName)
    await deleteSoftwareImageRecord(env.DB, image)
  } else if (image.phase !== 'done') {
    await saveSoftwareImage(env.DB, image, { sandboxId: null, phase: 'done' })
  }
}

export async function retrySoftwareImageCleanup(
  runtime: SoftwareImageRuntime,
  image: SoftwareImage,
): Promise<void> {
  try {
    await cleanupSoftwareImage(runtime, image)
  } catch (error) {
    if (!(error instanceof AttemptChanged))
      warnWorker({ kind: 'software_image_cleanup_failed' })
  }
}

export async function cleanupOldSoftwareImages(
  runtime: SoftwareImageRuntime,
  account: string,
): Promise<void> {
  const images = await softwareImages(runtime.env.DB, account)
  const newest = images.find((image) => image.state === 'ready')
  for (const image of images) {
    if (image.id === newest?.id) continue
    if (
      image.state === 'ready' &&
      !(await claimSoftwareImageDeletion(runtime.env.DB, image))
    )
      continue
    const current = await readSoftwareImage(runtime.env.DB, image.id)
    if (current?.state === 'deleting')
      await retrySoftwareImageCleanup(runtime, current)
  }
}
