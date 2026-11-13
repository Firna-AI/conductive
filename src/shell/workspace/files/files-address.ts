import { routes } from '../../../app/router'
import {
  lineLabel,
  readLineLabel,
  type LineRange,
} from '../../../shared/line-target'
import type {
  FileListKind,
  FileMode,
  FilesTab,
  FilesTarget,
} from '../../../files/navigation'

/** The first part of each address of the Files screens after the workspace. */
const FILES = 'files'

const lists: readonly FileListKind[] = ['all', 'changes', 'checks']
const modes: readonly FileMode[] = ['preview', 'source']

/**
 * The part of the Files screens that an address shows. `saved-list` is the
 * Files tab of a phone with the list of the saved view, at `files`.
 */
export type FilesPlace = { kind: 'saved-list' } | FilesTarget

/**
 * What the address after the workspace shows of the Files screens, or null
 * for the chat or a tool. The addresses:
 *
 * - `files`: the list of the saved view.
 * - `files/all`, `files/changes`, and `files/checks`: a list.
 * - `files/preview/<path>` and `files/source/<path>`: a file tab.
 * - `files/diff/<path>`: a diff tab.
 *
 * Another address under `files` shows the list of the saved view.
 */
export function filesPlace(view: readonly string[]): FilesPlace | null {
  const [area, kind, ...rest] = view
  if (area !== FILES) return null
  const path = rest.join('/')
  const list = lists.find((item) => item === kind)
  if (list && rest.length === 0) return { kind: 'list', list }
  const mode = modes.find((item) => item === kind)
  if (mode && path !== '') return { kind: 'file', path, mode }
  if (kind === 'diff' && path !== '') return { kind: 'diff', path }
  return { kind: 'saved-list' }
}

/** The file or diff tab that an address shows, or null. */
export function tabOf(place: FilesPlace | null): FilesTab | null {
  return place?.kind === 'file' || place?.kind === 'diff' ? place : null
}

/** The query of an address that names the lines of a file tab. */
const LINE = 'line'

/**
 * The lines that the query of an address names, such as `?line=42-50`, or
 * null. A file tab shows them in view and marked.
 */
export function addressLines(search: string): LineRange | null {
  return readLineLabel(new URLSearchParams(search).get(LINE))
}

/**
 * The address of a list, a file tab, or a diff tab of a workspace. Each
 * folder of a path is a part of the address, so the address stays readable.
 * A file tab with `lines` names them in the query, as `?line=42-50`.
 */
export function filesHref(
  orgId: string,
  workspaceId: string,
  target: FilesTarget,
  lines?: LineRange,
): string {
  switch (target.kind) {
    case 'list':
      return routes.workspace(orgId, workspaceId, FILES, target.list)
    case 'file': {
      const address = routes.workspace(
        orgId,
        workspaceId,
        FILES,
        target.mode,
        ...target.path.split('/'),
      )
      if (!lines) return address
      const query = new URLSearchParams({ [LINE]: lineLabel(lines) })
      return `${address}?${query}`
    }
    case 'diff':
      return routes.workspace(
        orgId,
        workspaceId,
        FILES,
        'diff',
        ...target.path.split('/'),
      )
  }
}
