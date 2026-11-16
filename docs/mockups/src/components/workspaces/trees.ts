import type { SidebarSection, WorkspaceRow } from './sections'

/**
 * The steps of the indent of a row in the list: 0 for a top-level row, and
 * one more for each row that the list shows above it in its tree. The
 * deepest sub-workspace has depth 3, so no row indents more.
 */
export type RowIndent = 0 | 1 | 2 | 3

/** The parent of each sub-workspace, by the key of the workspace. */
export type ParentLinks = ReadonlyMap<string, string>

/** The indent of a row that shows under a row with `indent`. */
function under(indent: RowIndent): RowIndent {
  switch (indent) {
    case 0:
      return 1
    case 1:
      return 2
    default:
      return 3
  }
}

/**
 * The row that the list shows a workspace under: its parent, or, when the
 * list does not show the parent, such as an archived one, the nearest
 * workspace above it in its tree that the list shows. None for a top-level
 * workspace, and for a workspace without such a row.
 */
function shownParent(
  key: string,
  parents: ParentLinks,
  shown: ReadonlySet<string>,
): string | undefined {
  const seen = new Set([key])
  let parent = parents.get(key)
  while (parent !== undefined && !seen.has(parent)) {
    if (shown.has(parent)) return parent
    seen.add(parent)
    parent = parents.get(parent)
  }
  return undefined
}

/** Sub-workspaces come in the order of their creation, oldest first. */
function byCreation(a: WorkspaceRow, b: WorkspaceRow): number {
  return a.workspace.number - b.workspace.number
}

/**
 * The sections of the list with their trees, as the shared rule of the
 * place of a row gives them. A workspace shows under the row of its parent
 * wherever the list shows that row, whatever section its own record names.
 * When the list does not show its parent, it shows under the nearest row
 * above it in its tree, so it indents one step less than its depth. A
 * workspace without such a row is a top-level row at its own place. Each
 * top-level row comes first, then its sub-workspaces, oldest first, each
 * followed by its own sub-workspaces.
 */
export function withTrees(
  sections: readonly SidebarSection[],
  parents: ParentLinks,
): SidebarSection[] {
  const rows = sections.flatMap((item) => item.rows)
  const shown = new Set(rows.map((row) => row.workspace.key))
  const children = new Map<string, WorkspaceRow[]>()
  const topLevel = new Set<string>()
  for (const row of rows) {
    const parent = shownParent(row.workspace.key, parents, shown)
    if (parent === undefined) topLevel.add(row.workspace.key)
    else children.set(parent, [...(children.get(parent) ?? []), row])
  }
  const tree = (row: WorkspaceRow, indent: RowIndent): WorkspaceRow[] => [
    { ...row, indent },
    ...(children.get(row.workspace.key) ?? [])
      .toSorted(byCreation)
      .flatMap((child) => tree(child, under(indent))),
  ]
  return sections.map((item) => ({
    ...item,
    rows: item.rows
      .filter((row) => topLevel.has(row.workspace.key))
      .flatMap((row) => tree(row, 0)),
  }))
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
