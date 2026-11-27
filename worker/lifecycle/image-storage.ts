import type { ImageBuild } from '../../src/shared/org-settings'
import type { ProviderDiskLines } from '../sandbox/accounts'
import type { SandboxProvider } from '../sandbox/provider'
import { warnWorker } from '../warnings'

/**
 * Only a good build of the org's current provider account can show storage.
 */
export const BUILD_STORAGE_COLUMNS = `image_builds.storage_total_bytes AS storageTotalBytes,
  image_builds.storage_free_bytes AS storageFreeBytes,
  image_builds.storage_root_used_bytes AS storageRootUsedBytes,
  CASE WHEN image_builds.state = 'succeeded'
    AND image_builds.provider_account = (SELECT provider_account FROM orgs WHERE orgs.id = image_builds.org_id)
    THEN image_builds.provider_account END AS storageAccount`

type BuildStorage = Pick<ImageBuild, 'storageTotalBytes' | 'storageFreeBytes'>

export type BuildStorageRow = BuildStorage & {
  storageAccount: string | null
  storageRootUsedBytes: number | null
}

export function readBuildStorage(
  row: BuildStorageRow,
  diskLines: ProviderDiskLines,
): BuildStorage {
  if (row.storageAccount !== null) {
    const line = diskLines.get(row.storageAccount)
    if (!line) {
      const { storageTotalBytes, storageFreeBytes } = row
      return { storageTotalBytes, storageFreeBytes }
    }
    if (row.storageRootUsedBytes !== null) {
      const storageTotalBytes = line.bytes - line.rootReserveBytes
      return {
        storageTotalBytes,
        storageFreeBytes: Math.max(
          0,
          storageTotalBytes - row.storageRootUsedBytes,
        ),
      }
    }
  }
  return { storageTotalBytes: null, storageFreeBytes: null }
}

/**
 * Measure the root file system before the home folder restore can finish.
 * The "Avail" column gives the bytes the user can write.
 */
export const STORAGE_COMMAND =
  'df --block-size=1 --output=size,used,avail -- / | tail -n 1'

export interface ImageStorage {
  totalBytes: number
  usedBytes: number
  freeBytes: number
}

/** Reads the last line of `STORAGE_COMMAND`, or null when it is not valid. */
export function readImageStorage(stdout: string): ImageStorage | null {
  const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(stdout)
  if (!match) return null
  const totalBytes = Number(match[1])
  const usedBytes = Number(match[2])
  const freeBytes = Number(match[3])
  if (
    !Number.isSafeInteger(totalBytes) ||
    !Number.isSafeInteger(usedBytes) ||
    !Number.isSafeInteger(freeBytes) ||
    totalBytes === 0 ||
    usedBytes > totalBytes ||
    freeBytes > totalBytes - usedBytes
  )
    return null
  return { totalBytes, usedBytes, freeBytes }
}

/**
 * Measures the free storage that the image of a build leaves. The number
 * only informs, so a failure records a warning and gives null, and the
 * build continues.
 */
export async function measureImageStorage(
  provider: SandboxProvider,
  sandboxId: string,
): Promise<ImageStorage | null> {
  try {
    const result = await provider.runCommand(sandboxId, STORAGE_COMMAND)
    const storage =
      result.exitCode === 0 && !result.timedOut
        ? readImageStorage(result.stdout)
        : null
    if (storage) return storage
  } catch {
    // The warning below covers a failed call too.
  }
  warnWorker({ kind: 'image_storage_unmeasured' })
  return null
}

/** Saves the root disk measurement. A repeat writes the same row again. */
export async function saveImageStorage(
  db: D1Database,
  buildId: string,
  storage: ImageStorage,
): Promise<void> {
  await db
    .prepare(
      `UPDATE image_builds SET storage_total_bytes = ?, storage_free_bytes = ?,
       storage_root_used_bytes = ? WHERE id = ?`,
    )
    .bind(storage.totalBytes, storage.freeBytes, storage.usedBytes, buildId)
    .run()
}
