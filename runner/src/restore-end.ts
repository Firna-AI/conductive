import { existsSync, unwatchFile, watchFile, type Stats } from 'node:fs'

/**
 * Calls `ended` once, when the restore marker appears.
 *
 * After a start from a saved snapshot, the sandbox provider restores the disk
 * in the background. A file watch made before the restore ends stays on the
 * old view of the disk, so it misses later edits. The Worker writes the
 * marker when the provider reports the end of the restore.
 *
 * A marker that already exists calls nothing, because the restore ended
 * before this call. The marker's memory folder can appear after the runner
 * starts, so a stat poll looks for the file instead of a folder watch.
 */
export function onRestoreEnd(
  marker: string,
  ended: () => void,
  interval = 1_000,
): () => void {
  if (existsSync(marker)) return () => {}
  let active = true
  const stop = () => {
    if (!active) return
    active = false
    unwatchFile(marker, listener)
  }
  const listener = (current: Stats) => {
    // Node reports a missing file as a zeroed Stats object.
    if (current.ino === 0 && current.mtimeMs === 0) return
    stop()
    ended()
  }
  watchFile(marker, { interval, persistent: false }, listener)
  return stop
}
