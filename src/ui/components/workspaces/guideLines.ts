import type { TreeLines } from '../../../shared/workspace-tree-lines'
import { classes } from '../common/classes'
import guides from './GuideLines.module.css'

/** The class that runs the line of each column through a row, from 0. */
const throughClasses = [guides.through0, guides.through1, guides.through2]

/**
 * The classes of the guide lines of a row of a tree, at `indent` steps,
 * from the facts of `treeLines` in `src/shared/`, for the rows of
 * `WorkspaceRow.module.css`. A nested row gets its corner (└). The line of
 * a column runs on through the row: the column of its parent while the
 * row is not the last one under it (├), and each outer column whose line
 * runs on (│). A row with nested rows under it gets the stub under its
 * mark, also a top-level row. Any other row draws no lines. It imports no
 * fixture value, so the app uses it too.
 */
export function guideClasses(
  indent: number,
  lines: TreeLines | undefined,
): string {
  if (lines === undefined || (indent === 0 && !lines.hasNested)) return ''
  const runs = Array.from({ length: indent }, (_, column) =>
    column === indent - 1 ? !lines.last : (lines.through[column] ?? false),
  )
  return classes(
    guides.tree,
    indent > 0 && guides.corner,
    ...runs.map((on, column) => on && throughClasses[column]),
    lines.hasNested && guides.stub,
  )
}
