import type { TreeLines } from '../../../../../src/shared/workspace-tree-lines'
import { issueLabel, type Issue } from '../../fixtures/issues'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { guideClasses } from '../workspaces/guideLines'
import rows from '../workspaces/WorkspaceRow.module.css'
import { statusLabels } from './issueCopy'
import { IssueStatusIcon } from './IssueStatusIcon'
import styles from './IssueListRow.module.css'

/** An issue as a row of the workspace list. */
export type IssueItem = {
  issue: Issue
  to?: string
  selected?: boolean
  /** The row heads a tree of the workspaces of the issue, in variation C. */
  lines?: TreeLines
  /** The time, or a count such as "2 workspaces", at the end of the row. */
  end?: string
}

/**
 * An issue in the workspace list: its state circle in the column of the
 * list marks, its title, and its label at the end. The circle has no grid
 * of cells, so an issue never reads as a workspace with a cloud computer.
 * An issue without a workspace keeps the muted ink of a stopped row. An
 * issue that heads a tree takes the ink colour, and its stub joins the
 * guide line of the workspaces under it.
 */
export function IssueListRow(
  props: IssueItem & { variant: 'sidebar' | 'page' },
) {
  const { issue } = props
  const heads = props.lines?.hasNested === true
  const className = classes(
    rows.row,
    props.variant === 'page' && rows.page,
    props.selected && rows.selected,
    guideClasses(0, props.lines),
  )
  const content = (
    <>
      <span className={styles.icon}>
        <IssueStatusIcon status={issue.status} />
      </span>
      <span className={classes(rows.name, heads ? styles.heads : styles.waits)}>
        {issue.title}
      </span>
      <span className={styles.end}>
        {props.end ?? issueLabel(issue.number)}
      </span>
      <span className={a11y.hidden}>, issue, {statusLabels[issue.status]}</span>
    </>
  )
  return (
    <span className={rows.container}>
      {props.to ? (
        <ScreenLink
          aria-current={props.selected ? 'page' : undefined}
          className={className}
          to={props.to}
        >
          {content}
        </ScreenLink>
      ) : (
        <div className={className}>{content}</div>
      )}
    </span>
  )
}
