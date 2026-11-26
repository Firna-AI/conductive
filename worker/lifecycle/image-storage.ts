import type { SandboxProvider } from '../sandbox/provider'
import { warnWorker } from '../warnings'

/**
 * The free storage columns of a build row of `image_builds`, for the
 * browser. Only a good build of the current provider account of its org
 * gives them, because a build of another account measured another disk.
 */
export const BUILD_STORAGE_COLUMNS = `CASE WHEN image_builds.state = 'succeeded'
    AND image_builds.provider_account = (SELECT provider_account FROM orgs WHERE orgs.id = image_builds.org_id)
    THEN image_builds.storage_total_bytes END AS storageTotalBytes,
  CASE WHEN image_builds.state = 'succeeded'
    AND image_builds.provider_account = (SELECT provider_account FROM orgs WHERE orgs.id = image_builds.org_id)
    THEN image_builds.storage_free_bytes END AS storageFreeBytes`

/** The folder that holds the repositories of each new cloud computer. */
const HOME_FOLDER = '/home/user'

/**
 * The size and the free space of the file system of the home folder, in
 * bytes. The free space is the "Avail" column of `df`: the space that the
 * user of the cloud computer can write, without the part kept for root.
 */
export const STORAGE_COMMAND = `df --block-size=1 --output=size,avail -- ${HOME_FOLDER} | tail -n 1`

export interface ImageStorage {
  totalBytes: number
  freeBytes: number
}

/** Reads the last line of `STORAGE_COMMAND`, or null when it is not valid. */
export function readImageStorage(stdout: string): ImageStorage | null {
  const match = /^\s*(\d+)\s+(\d+)\s*$/.exec(stdout)
  if (!match) return null
  const totalBytes = Number(match[1])
  const freeBytes = Number(match[2])
  if (
    !Number.isSafeInteger(totalBytes) ||
    !Number.isSafeInteger(freeBytes) ||
    totalBytes === 0 ||
    freeBytes > totalBytes
  )
    return null
  return { totalBytes, freeBytes }
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

/** Saves the free storage of a build. A repeat writes the same row again. */
export async function saveImageStorage(
  db: D1Database,
  buildId: string,
  storage: ImageStorage,
): Promise<void> {
  await db
    .prepare(
      'UPDATE image_builds SET storage_total_bytes = ?, storage_free_bytes = ? WHERE id = ?',
    )
    .bind(storage.totalBytes, storage.freeBytes, buildId)
    .run()
}
