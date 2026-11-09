import { splitPath } from '../navigation'
import type { FilesSnapshot } from './files-store'

/**
 * The text that a screen shows for a file of a report or a reply: its
 * display path, which hides each secret value. The Worker leaves the
 * display path out when it equals the real path, so a record without one
 * shows its real path. A label is text only: it never becomes a path, a
 * key, an address, or a request.
 */
export function pathLabel(record: {
  path: string
  displayPath?: string
}): string {
  return record.displayPath ?? record.path
}

/** The name that a tab or a header shows when no record names its file. */
export const unknownFileName = 'File'

/**
 * The label of a real path from the lists of the workspace, or null when
 * neither list names it. A diff looks in Changes first, and a file looks in
 * All files first.
 */
export function listLabel(
  snapshot: FilesSnapshot,
  path: string,
  kind: 'file' | 'diff',
): string | null {
  const entry = snapshot.tree?.entries.get(path)
  const changed = snapshot.changes?.files.find((file) => file.path === path)
  const [first, second] = kind === 'diff' ? [changed, entry] : [entry, changed]
  const record = first ?? second
  return record ? pathLabel(record) : null
}

/**
 * The label of an open page: from the reply that it read for its path, or
 * else from the lists, or null when neither names the file.
 */
export function pageLabel(
  snapshot: FilesSnapshot,
  path: string,
  kind: 'file' | 'diff',
  reply: { path: string; displayPath?: string } | null,
): string | null {
  if (reply && reply.path === path) return pathLabel(reply)
  return listLabel(snapshot, path, kind)
}

/** The file name of a label, or the word for a file that no record names. */
export function labelName(label: string | null): string {
  return label === null ? unknownFileName : splitPath(label).name
}
