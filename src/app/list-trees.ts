import type { Workspace } from '../shared/generated/Workspace'
import type { WorkspacePlacement } from '../shared/workspace-tree'
import { treeLines, type TreeLines } from '../shared/workspace-tree-lines'

/**
 * A row of the workspace list: a live workspace, the section that shows
 * it, the workspace whose row it shows under, or null for a top-level row,
 * and its depth, the number of rows that the list shows above it in its
 * tree. `placeWorkspaces` of `src/shared/` places each row, as the Worker
 * does.
 */
export type ListRow = WorkspacePlacement<Workspace>

/** The top-level rows of a section: the places that a move counts. */
export function topLevelRows(rows: readonly ListRow[]): ListRow[] {
  return rows.filter((row) => row.parentId === null)
}

/**
 * The tree of a top-level row among the rows of its section, in tree
 * order: the row, then each row nested under it. A nested row moves only
 * with its top-level row, so it has no tree of its own.
 */
export function treeOf(
  rows: readonly ListRow[],
  workspaceId: string,
): ListRow[] {
  const start = rows.findIndex((row) => row.workspace.id === workspaceId)
  if (start < 0 || rows[start].parentId !== null) return []
  const end = rows.findIndex(
    (row, index) => index > start && row.parentId === null,
  )
  return rows.slice(start, end < 0 ? rows.length : end)
}

/**
 * Each workspace under a workspace by its parent links, at each depth,
 * live or archived. A move of a tree writes their section too.
 */
export function workspacesUnder(
  workspaces: readonly Workspace[],
  workspaceId: string,
): Set<string> {
  const under = new Set<string>()
  const parents = [workspaceId]
  for (
    let parent = parents.pop();
    parent !== undefined;
    parent = parents.pop()
  ) {
    for (const workspace of workspaces) {
      if (workspace.parentId !== parent || under.has(workspace.id)) continue
      if (workspace.id === workspaceId) continue
      under.add(workspace.id)
      parents.push(workspace.id)
    }
  }
  return under
}

/** Oldest first, as the shared rule orders the rows under one row. */
function byCreation(a: Workspace, b: Workspace): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id)
}

/**
 * The live workspaces that show right under the row of a workspace: its
 * live sub-workspaces, and at each depth those of its archived ones.
 */
function shownUnder(
  workspaces: readonly Workspace[],
  workspaceId: string,
): Set<string> {
  const shown = new Set<string>()
  const seen = new Set([workspaceId])
  const parents = [workspaceId]
  for (
    let parent = parents.pop();
    parent !== undefined;
    parent = parents.pop()
  ) {
    for (const workspace of workspaces) {
      if (workspace.parentId !== parent || seen.has(workspace.id)) continue
      seen.add(workspace.id)
      if (workspace.state === 'archived') parents.push(workspace.id)
      else shown.add(workspace.id)
    }
  }
  return shown
}

/**
 * The list with one workspace changed by `change`. When the change
 * archives a live workspace, each live workspace that showed right under
 * its row takes its section and its place, right after it, oldest first,
 * as the Worker writes them with the Archive. So these rows stay where the
 * list showed them until the next read, and a Restore puts them back under
 * it. A change that keeps the record, or a workspace that the list does
 * not have, leaves the list as it is.
 */
export function replaceWorkspace(
  workspaces: readonly Workspace[],
  workspaceId: string,
  change: (workspace: Workspace) => Workspace,
): readonly Workspace[] {
  const index = workspaces.findIndex((item) => item.id === workspaceId)
  const current = workspaces[index]
  if (current === undefined) return workspaces
  const next = change(current)
  if (next === current) return workspaces
  const changed = workspaces.with(index, next)
  if (current.state === 'archived' || next.state !== 'archived') return changed
  const under = shownUnder(changed, workspaceId)
  if (under.size === 0) return changed
  const moved = changed
    .filter((item) => under.has(item.id))
    .sort(byCreation)
    .map((item) => ({ ...item, sectionId: next.sectionId }))
  const rest = changed.filter((item) => !under.has(item.id))
  const at = rest.indexOf(next) + 1
  return [...rest.slice(0, at), ...moved, ...rest.slice(at)]
}

/** A row of a section with the tree that it belongs to. */
export interface TreeRow {
  row: ListRow
  /** The workspace of the top-level row of its tree. */
  treeId: string
  /** The place of its tree among the top-level rows of the section. */
  place: number
  /** The guide lines of the row in its tree, as the mockups draw them. */
  lines: TreeLines
}

/**
 * The rows of a section in tree order, each with its tree: the top-level
 * row above it, or itself, the place of that row among the top-level rows,
 * and the guide lines of the row from `treeLines` of `src/shared/`.
 */
export function treeRows(rows: readonly ListRow[]): TreeRow[] {
  const lines = treeLines(rows)
  const trees: TreeRow[] = []
  for (const [index, row] of rows.entries()) {
    const last = trees.at(-1)
    const tree =
      row.parentId === null || last === undefined
        ? { treeId: row.workspace.id, place: (last?.place ?? -1) + 1 }
        : { treeId: last.treeId, place: last.place }
    trees.push({ row, ...tree, lines: lines[index] })
  }
  return trees
}

/**
 * The rows that a section shows, as `treeRows` gives them. An open section
 * shows each row. A collapsed section shows only the row of the open
 * workspace, when it holds that workspace, so the open workspace stays in
 * sight. That row shows as a top-level row, with no indent and no guide
 * lines, because the list shows no other row of its tree. The list hides
 * the places of the section, so the list moves that row by no drag and no
 * key.
 */
export function shownTreeRows(
  rows: readonly ListRow[],
  collapsed: boolean,
  selectedId: string | null,
): TreeRow[] {
  const all = treeRows(rows)
  if (!collapsed) return all
  return all
    .filter(({ row }) => row.workspace.id === selectedId)
    .map((shown) => ({
      ...shown,
      row: { ...shown.row, depth: 0 },
      lines: { last: false, through: [], hasNested: false },
    }))
}
