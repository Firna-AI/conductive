import {
  placeWorkspaces,
  type TreeWorkspace,
} from '../../../../../src/shared/workspace-tree'
import { treeLines } from '../../../../../src/shared/workspace-tree-lines'
import { defaultSection } from '../../fixtures/sections'
import type { SidebarSection, WorkspaceRow } from './sections'

/**
 * The steps of the indent of a row in the list: 0 for a top-level row, and
 * one more for each row that the list shows above it in its tree. The
 * deepest sub-workspace has depth 3, so no row indents more.
 */
export type RowIndent = 0 | 1 | 2 | 3

/** The parent of each sub-workspace, by the key of the workspace. */
export type ParentLinks = ReadonlyMap<string, string>

/** A workspace of the list as the shared rule reads it, with its row. */
type TreeRow = TreeWorkspace & { row: WorkspaceRow }

/**
 * The indent of a row at the depth that the shared rule gives it: the
 * number of rows that the list shows above it in its tree.
 */
function indentOf(depth: number): RowIndent {
  switch (depth) {
    case 0:
      return 0
    case 1:
      return 1
    case 2:
      return 2
    default:
      return 3
  }
}

/**
 * The sections of the list with their trees, as `placeWorkspaces` in
 * `src/shared/` places them. The app and the Worker use the same rule, so
 * the mockups place each row as the app does. `sections` gives each
 * workspace in the section of its record, at its place: each live row, and
 * each archived row, which keeps its place for a Restore. The result has
 * only the live rows.
 *
 * A workspace shows under the row of its parent wherever the list shows
 * that row, whatever section its own record names. When the list does not
 * show its parent, such as an archived one, it shows under the nearest
 * live row above it in its tree, in the place of the archived row. So it
 * indents one step less than its depth. A workspace without such a row is
 * a top-level row of its own section. Each top-level row comes first, then
 * its sub-workspaces, oldest first, each followed by its own
 * sub-workspaces. Each row gets the guide lines of its tree from
 * `treeLines`, which the app uses too.
 *
 * `queued` names the workspaces that the Merge queue group shows. The list
 * leaves them out of their sections with the rule of an archived parent
 * (decision 318), so the rule reads them as archived.
 */
export function withTrees(
  sections: readonly SidebarSection[],
  parents: ParentLinks,
  queued: ReadonlySet<string> = new Set(),
): SidebarSection[] {
  const workspaces = sections.flatMap(({ section, rows }) =>
    rows.map((row): TreeRow => ({
      id: row.workspace.key,
      parentId: parents.get(row.workspace.key) ?? null,
      sectionId: section.key,
      state: queued.has(row.workspace.key) ? 'archived' : row.status,
      // The number of a workspace counts up in the order of creation.
      createdAt: row.workspace.number,
      row,
    })),
  )
  const placed = placeWorkspaces(
    workspaces,
    sections.map(({ section }, position) => ({
      id: section.key,
      position,
      isDefault: section.key === defaultSection,
    })),
  )
  return sections.map((item) => {
    const rows = placed.filter(
      ({ sectionId }) => sectionId === item.section.key,
    )
    const lines = treeLines(rows)
    return {
      ...item,
      rows: rows.map(({ workspace, depth }, index) => ({
        ...workspace.row,
        indent: indentOf(depth),
        lines: lines[index],
      })),
    }
  })
}

/** The list shows the row under another row of its tree. */
export function isNested(row: WorkspaceRow): boolean {
  return (row.indent ?? 0) > 0
}

/**
 * The tree of a top-level row among the rows of its section: the row, then
 * the nested rows under it, which move with it. A nested row has no drag,
 * so it carries no tree.
 */
export function treeOf(
  rows: readonly WorkspaceRow[],
  key: string,
): WorkspaceRow[] {
  const start = rows.findIndex((row) => row.workspace.key === key)
  if (start < 0 || isNested(rows[start])) return []
  const end = rows.findIndex((row, index) => index > start && !isNested(row))
  return rows.slice(start, end < 0 ? rows.length : end)
}
