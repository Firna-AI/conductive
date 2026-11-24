import {
  deleteSandboxIfPresent,
  deleteSnapshotIfPresent,
} from '../lifecycle/cleanup'
import { providerForAccount } from '../sandbox/client'
import { softwareImageMachineOwner } from '../machines/client'
import { revokeMachineTokenOnStop } from '../machines/revoke'
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

async function cleanupSoftwareImage(
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
    const sandboxId = await allocateSoftwareImage(runtime, provider, image)
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
  const failures: unknown[] = []
  if (image.phase !== 'done') {
    try {
      const revoke = () =>
        revokeMachineTokenOnStop(
          env,
          softwareImageMachineOwner(image.id),
          'retry',
        )
      if (runtime.poll) await runtime.poll.runNetworkCall(revoke)
      else await revoke()
    } catch (error) {
      failures.push(error)
    }
  }
  if (image.sandboxId) {
    try {
      await deleteSandboxIfPresent(
        env.DB,
        provider,
        { providerAccount: image.providerAccount, sandboxId: image.sandboxId },
        dependencies.now(),
      )
    } catch (error) {
      failures.push(error)
    }
  }
  if (
    image.state === 'deleting' ||
    (image.state === 'failed' && image.snapshotRecorded)
  ) {
    try {
      await deleteSnapshotIfPresent(provider, image.snapshotName)
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length > 0) throw failures[0]
  if (image.state === 'deleting') {
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
  currentVersion: string | null,
): Promise<void> {
  const images = await softwareImages(runtime.env.DB, account)
  for (const image of images) {
    if (
      image.state === 'ready' &&
      (currentVersion === null || image.version === currentVersion)
    )
      continue
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
