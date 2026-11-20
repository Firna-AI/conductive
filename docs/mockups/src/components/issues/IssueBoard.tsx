import { Play } from 'lucide-react'
import { issueLabel, type Issue, type IssueStatus } from '../../fixtures/issues'
import { workspaceOf } from '../../fixtures/issueWorkspaces'
import { people } from '../../fixtures/members'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { PersonAvatar } from '../orgs/OrgTile'
import { listMarkLabel } from '../workspaces/status'
import { statusLabels } from './issueCopy'
import { IssueStatusIcon, PriorityIcon } from './IssueStatusIcon'
import { LinkedWorkspaces } from './LinkedWorkspace'
import styles from './IssueBoard.module.css'

const columns: readonly IssueStatus[] = [
  'backlog',
  'todo',
  'in-progress',
  'in-review',
  'done',
]

/** A card that the user drags to another column, and where it lands. */
export type BoardDrag = { issue: string; to: IssueStatus }

/**
 * One issue as a card: its label and priority, its title, the live marks
 * of its workspaces with the state of the first one in words, and its
 * assignee.
 */
function IssueCard(props: {
  issue: Issue
  to?: string
  look?: 'lifted' | 'placeholder'
}) {
  const { issue } = props
  const assignee = issue.assignee ? people[issue.assignee] : undefined
  const first = issue.workspaces.at(0)
  const live = first ? workspaceOf(first) : undefined
  const content = (
    <>
      <span className={styles.top}>
        <span className={styles.label}>{issueLabel(issue.number)}</span>
        <PriorityIcon priority={issue.priority} />
      </span>
      <span className={styles.title}>{issue.title}</span>
      <span className={styles.foot}>
        <LinkedWorkspaces workspaces={issue.workspaces} />
        {live ? (
          <span className={styles.state}>
            {listMarkLabel(live.github, live.status)}
          </span>
        ) : null}
        <span className={styles.spacer} />
        {assignee ? (
          <PersonAvatar initials={assignee.initials} size={18} />
        ) : null}
      </span>
    </>
  )
  const className = classes(styles.card, props.look && styles[props.look])
  return props.to ? (
    <ScreenLink className={className} to={props.to}>
      {content}
    </ScreenLink>
  ) : (
    <div className={className}>{content}</div>
  )
}

/**
 * The issues of the org as a board, one column for each state. A card
 * that the user drops on In progress starts a workspace for its issue, so
 * the column shows where it lands while the card hovers over it.
 */
export function IssueBoard(props: {
  issues: readonly Issue[]
  links?: Readonly<Record<string, string>>
  drag?: BoardDrag
}) {
  const { drag } = props
  const dragged = props.issues.find((issue) => issue.key === drag?.issue)
  return (
    <div className={styles.board}>
      {columns.map((status) => {
        const cards = props.issues.filter((issue) => issue.status === status)
        const target = drag?.to === status && dragged !== undefined
        return (
          <section
            aria-label={statusLabels[status]}
            className={classes(styles.column, target && styles.target)}
            key={status}
          >
            <h3 className={styles.heading}>
              <IssueStatusIcon status={status} />
              {statusLabels[status]}
              <span className={styles.count}>{cards.length}</span>
            </h3>
            {target && dragged ? (
              <div className={styles.drop}>
                <span className={styles.dropWords}>
                  <Play aria-hidden size={13} />
                  Drop to start a workspace
                </span>
                <IssueCard issue={dragged} look="lifted" />
              </div>
            ) : null}
            <ul className={styles.cards}>
              {cards.map((issue) => (
                <li key={issue.key}>
                  <IssueCard
                    issue={issue}
                    look={issue.key === drag?.issue ? 'placeholder' : undefined}
                    to={props.links?.[issue.key]}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
