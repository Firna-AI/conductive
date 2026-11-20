import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { CheckSquare2, Square } from 'lucide-react'
import { issueLabel, type Issue } from '../../fixtures/issues'
import { people, type PersonKey } from '../../fixtures/members'
import { repositories } from '../../fixtures/repositories'
import { sections } from '../../fixtures/sections'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { PersonAvatar } from '../orgs/OrgTile'
import { priorityLabels, statusLabels } from './issueCopy'
import { IssueStatusIcon, PriorityIcon } from './IssueStatusIcon'
import styles from './IssueDetail.module.css'

/** One line of the activity of an issue. */
export type ActivityEntry = {
  who?: PersonKey
  /** What happened, after the name of the person. */
  text: string
  time: string
}

/** The fields of the issue, as a list of names and values. */
function Properties(props: { issue: Issue; inline: boolean }) {
  const { issue } = props
  const assignee = issue.assignee ? people[issue.assignee] : undefined
  const entries: { name: string; value: ReactNode }[] = [
    {
      name: 'State',
      value: (
        <>
          <IssueStatusIcon status={issue.status} />
          {statusLabels[issue.status]}
        </>
      ),
    },
    {
      name: 'Priority',
      value: (
        <>
          <PriorityIcon priority={issue.priority} />
          {priorityLabels[issue.priority]}
        </>
      ),
    },
    {
      name: 'Assignee',
      value: assignee ? (
        <>
          <PersonAvatar initials={assignee.initials} size={16} />
          {assignee.name}
        </>
      ) : (
        'No one'
      ),
    },
    {
      name: 'Repository',
      value: issue.repository ? repositories[issue.repository].name : 'Any',
    },
    { name: 'Section', value: sections[issue.section].name },
  ]
  return (
    <dl className={classes(styles.properties, props.inline && styles.inline)}>
      {entries.map((entry) => (
        <div className={styles.property} key={entry.name}>
          <dt className={styles.name}>{entry.name}</dt>
          <dd className={styles.value}>{entry.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The checklist of the issue. An agent can tick an item of its workspace. */
function Checklist(props: { items: NonNullable<Issue['checklist']> }) {
  return (
    <ul className={styles.checklist}>
      {props.items.map((item) => {
        const Icon = item.done ? CheckSquare2 : Square
        return (
          <li
            className={classes(styles.check, item.done && styles.done)}
            key={item.text}
          >
            <Icon aria-hidden className={styles.checkIcon} size={14} />
            <span>{item.text}</span>
            <span className={a11y.hidden}>
              {item.done ? ', done' : ', to do'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Activity(props: { entries: readonly ActivityEntry[] }) {
  return (
    <ol className={styles.activity}>
      {props.entries.map((entry) => (
        <li className={styles.event} key={`${entry.text}-${entry.time}`}>
          {entry.who ? (
            <PersonAvatar initials={people[entry.who].initials} size={16} />
          ) : (
            <span aria-hidden className={styles.dot} />
          )}
          <span className={styles.eventText}>
            {entry.who ? <strong>{people[entry.who].name} </strong> : null}
            {entry.text}
          </span>
          <span className={styles.time}>{entry.time}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * An issue: its label, title, description, and checklist, then the block
 * of its workspaces and its activity. On a wide page its fields stand in a
 * column at the side. In a panel and on a phone they stand under the
 * title, as a wrapped line.
 */
export function IssueDetail(props: {
  issue: Issue
  viewport: Viewport
  /** The narrow layout of the right column or of a tab. */
  panel?: boolean
  /** The block of the workspaces of the issue, with its actions. */
  workspaces: ReactNode
  activity: readonly ActivityEntry[]
}) {
  const { issue } = props
  const narrow = props.panel === true || props.viewport === 'mobile'
  const main = (
    <div className={styles.main}>
      <span className={styles.label}>{issueLabel(issue.number)}</span>
      <h1 className={classes(styles.title, narrow && styles.smallTitle)}>
        {issue.title}
      </h1>
      {narrow ? <Properties inline issue={issue} /> : null}
      <div className={styles.body}>
        {issue.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {issue.checklist ? <Checklist items={issue.checklist} /> : null}
      {props.workspaces}
      <h2 className={styles.heading}>Activity</h2>
      <Activity entries={props.activity} />
    </div>
  )
  if (narrow) return <div className={styles.narrow}>{main}</div>
  return (
    <div className={styles.wide}>
      {main}
      <aside aria-label="Fields" className={styles.side}>
        <Properties inline={false} issue={issue} />
      </aside>
    </div>
  )
}
