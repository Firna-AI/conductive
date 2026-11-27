import { readChangesDeltaPaths } from '../../shared/changes-delta-paths'
import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { ChangesDelta } from '../../shared/generated/ChangesDelta'

export function applyChangesDelta(
  before: BrowserChangesResponse,
  delta: ChangesDelta,
): { changes: BrowserChangesResponse; touched: ReadonlySet<string> } | null {
  if (
    before.revision === undefined ||
    delta.revision !== before.revision + 1 ||
    before.files.length !== before.summary.files
  )
    return null

  const { removes, upserts, ...header } = delta
  const changedPaths = readChangesDeltaPaths(delta)
  if (!changedPaths) return null
  const missingRemoves = new Set(removes)
  const lastIndex = upserts.at(-1)?.index ?? -1

  const touched = new Set(changedPaths)
  let { added, removed } = before.summary
  const kept =
    changedPaths.size === 0
      ? before.files
      : before.files.filter((file) => {
          missingRemoves.delete(file.path)
          if (!changedPaths.has(file.path)) return true
          if (file.previousPath) touched.add(file.previousPath)
          added -= file.added
          removed -= file.removed
          return false
        })
  const length = kept.length + upserts.length
  if (
    missingRemoves.size > 0 ||
    lastIndex >= length ||
    length !== header.summary.files
  )
    return null

  for (const { file } of upserts) {
    if (file.previousPath) touched.add(file.previousPath)
    added += file.added
    removed += file.removed
  }
  if (added !== header.summary.added || removed !== header.summary.removed)
    return null
  let keptIndex = 0
  let upsertIndex = 0
  const files =
    upserts.length === 0
      ? kept
      : Array.from({ length }, (_, index) => {
          const upsert = upserts[upsertIndex]
          if (upsert?.index === index) {
            upsertIndex += 1
            return upsert.file
          }
          const file = kept[keptIndex]
          keptIndex += 1
          return file
        })
  return { changes: { ...header, files }, touched }
}

/** A full list can change the diff of any listed path. */
export function listedPaths(
  before: BrowserChangesResponse,
  after: BrowserChangesResponse,
): ReadonlySet<string> {
  const touched = new Set<string>()
  for (const file of [...before.files, ...after.files]) {
    touched.add(file.path)
    if (file.previousPath) touched.add(file.previousPath)
  }
  return touched
}
