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

/**
 * Whether the label of a record hides a secret value: its label is not its
 * real path. The real path of such a record then leaves no screen: no copy,
 * no mention, and no item of a menu takes it. This is the one check of the
 * list of `@`, the row menu, and the tab menu. An entry of a moved folder
 * keeps its old label until its update, so it hides one until then too.
 */
export function hidesSecret(record: {
  path: string
  displayPath?: string
}): boolean {
  return pathLabel(record) !== record.path
}

/** The name that a tab or a header shows when no record names its file. */
export const unknownFileName = 'File'

/**
 * The label of a real path from the lists of the workspace, or null when
 * neither list names it. A diff looks in Changes first, and a file looks in
 * All files first.
 */
function listLabel(
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
 * else the label of its tab, as `tabLabel` gives it, or null when no record
 * names the file. So a page whose read fails, and a page that shows again
 * before its read answers, keep the label of the last read of a path that
 * no list names.
 */
export function pageLabel(
  snapshot: FilesSnapshot,
  path: string,
  kind: 'file' | 'diff',
  reply: { path: string; displayPath?: string } | null,
): string | null {
  if (reply && reply.path === path) return pathLabel(reply)
  return tabLabel(snapshot, path, kind)
}

/**
 * The label of the path of a tab: from the lists, or else from the last
 * read of the path, or null when neither names the file. A path that no
 * list names, such as an ignored file, so shows its name after its page
 * read it once.
 */
export function tabLabel(
  snapshot: FilesSnapshot,
  path: string,
  kind: 'file' | 'diff',
): string | null {
  return (
    listLabel(snapshot, path, kind) ?? snapshot.readLabels.get(path) ?? null
  )
}

/**
 * Whether the label of a tab, from `tabLabel`, hides a secret value, as
 * `hidesSecret` says. A tab whose label is not known yet, which shows
 * "File", counts as hiding one, so a missing label lets no value through.
 */
export function tabHidesSecret(path: string, label: string | null): boolean {
  return label === null || hidesSecret({ path, displayPath: label })
}

/** The file name of a label, or the word for a file that no record names. */
export function labelName(label: string | null): string {
  return label === null ? unknownFileName : splitPath(label).name
}
