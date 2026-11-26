import type { ImageBuild } from '../shared/org-settings'

/** Bytes in decimal gigabytes, with one decimal place. */
function gigabytes(bytes: number): string {
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`
}

/**
 * The free storage that a good build leaves for each new cloud computer,
 * such as "31.2 GB free of 50.1 GB". A build without a measurement gives
 * null, and the card then shows no storage text.
 */
export function buildStorage(build: ImageBuild): string | null {
  if (build.state !== 'succeeded') return null
  const { storageTotalBytes: total, storageFreeBytes: free } = build
  if (total === null || free === null) return null
  return `${gigabytes(free)} free of ${gigabytes(total)}`
}
