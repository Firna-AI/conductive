/**
 * A row of one section as `placeWorkspaces` places it: its workspace, and
 * the workspace whose row it shows under, or null for a top-level row.
 */
interface ShownRow {
  workspace: { id: string }
  parentId: string | null
}

/**
 * The guide lines of one row of a tree, as a file tree draws them. Column 0
 * lies under the mark of the top-level row of the tree, and each next column
 * under the mark of a row one level deeper.
 */
export interface TreeLines {
  /**
   * The row is the last row that the list shows under its parent. So the
   * line of its parent ends at its connector (└), and does not run on to a
   * later row (├). False for a top-level row.
   */
  last: boolean
  /**
   * One entry for each outer column, from column 0 inward: whether the line
   * of that column runs on through the row (│), because the row of that
   * column shows more rows below this one. A nested row at depth n has
   * n - 1 outer columns, and its own column, the next one, holds its
   * connector. A top-level row has none.
   */
  through: readonly boolean[]
  /**
   * The list shows rows under the row, so a stub joins its mark to the line
   * of those rows.
   */
  hasNested: boolean
}

/**
 * The guide lines of each row of one section, from its rows in tree order,
 * as `placeWorkspaces` gives them: each top-level row, then the rows under
 * it, each followed by its own. The lines follow the rows that the list
 * shows, so a row that shows under its grandparent after an Archive joins
 * the line of its grandparent. The result has one entry for each row, in
 * the same order.
 */
export function treeLines(rows: readonly ShownRow[]): TreeLines[] {
  /** The last row that the list shows under each row, by its workspace. */
  const lastUnder = new Map<string, ShownRow>()
  for (const row of rows) {
    if (row.parentId !== null) lastUnder.set(row.parentId, row)
  }
  const isLast = (row: ShownRow) =>
    row.parentId !== null && lastUnder.get(row.parentId) === row
  /** The rows above the current row in its tree, the top-level row first. */
  const above: ShownRow[] = []
  return rows.map((row) => {
    while (above.length > 0 && above.at(-1)?.workspace.id !== row.parentId) {
      above.pop()
    }
    // The line of an outer column runs on while the row in the next column
    // has a later row under the same parent.
    const through = above.slice(1).map((ancestor) => !isLast(ancestor))
    above.push(row)
    return {
      last: isLast(row),
      through,
      hasNested: lastUnder.has(row.workspace.id),
    }
  })
}
