import type { Viewport } from '@mokly/mokly'
import { issueLabel, type Issue } from '../../fixtures/issues'
import { people } from '../../fixtures/members'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { PersonAvatar } from '../orgs/OrgTile'
import { IssueStatusIcon, PriorityIcon } from './IssueStatusIcon'
import { LinkedWorkspaces } from './LinkedWorkspace'
import styles from './IssueRow.module.css'

/**
 * One issue on one line of the Issues page: its priority, its label, its
 * state, its title, the live marks of its workspaces, its assignee, and
 * the time of its last change. A phone puts the label and the marks under
 * the title.
 */
export function IssueRow(props: {
  issue: Issue
  viewport: Viewport
  to?: string
  selected?: boolean
}) {
  const { issue } = props
  const phone = props.viewport === 'mobile'
  const assignee = issue.assignee ? people[issue.assignee] : undefined
  const avatar = assignee ? (
    <PersonAvatar initials={assignee.initials} size={18} />
  ) : (
    <span aria-label="No assignee" className={styles.noAssignee} role="img" />
  )
  const content = phone ? (
    <>
      <IssueStatusIcon status={issue.status} />
      <span className={styles.lines}>
        <span className={styles.title}>{issue.title}</span>
        <span className={styles.meta}>
          <PriorityIcon priority={issue.priority} />
          <span className={styles.label}>{issueLabel(issue.number)}</span>
          <LinkedWorkspaces workspaces={issue.workspaces} />
        </span>
      </span>
      {avatar}
    </>
  ) : (
    <>
      <PriorityIcon priority={issue.priority} />
      <span className={styles.label}>{issueLabel(issue.number)}</span>
      <IssueStatusIcon status={issue.status} />
      <span className={styles.title}>{issue.title}</span>
      <LinkedWorkspaces workspaces={issue.workspaces} />
      {avatar}
      <span className={styles.time}>{issue.updated}</span>
    </>
  )
  const className = classes(
    styles.row,
    phone && styles.phone,
    props.selected && styles.selected,
  )
  return props.to ? (
    <ScreenLink className={className} to={props.to}>
      {content}
    </ScreenLink>
  ) : (
    <div className={className}>{content}</div>
  )
}
