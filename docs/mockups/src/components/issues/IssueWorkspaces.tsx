import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { agents } from '../../fixtures/agents'
import { workspaceOf } from '../../fixtures/issueWorkspaces'
import { people } from '../../fixtures/members'
import { AgentMark } from '../chat/AgentMark'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { DiffStat } from '../files/DiffStat'
import { PersonAvatar } from '../orgs/OrgTile'
import { workspaceLabel } from '../workspaces/label'
import { listMarkLabel } from '../workspaces/status'
import { WorkspaceMark } from '../workspaces/WorkspaceMark'
import styles from './IssueWorkspaces.module.css'

/** The changes of an attempt, for the comparison of variation C. */
export type AttemptStat = { added: number; removed: number; files: number }

/** One workspace of the issue, as a row that opens it. */
function WorkspaceLine(props: {
  workspace: string
  to?: string
  stat?: AttemptStat
}) {
  const workspace = workspaceOf(props.workspace)
  const owner = people[workspace.owner]
  const content = (
    <>
      <WorkspaceMark github={workspace.github} status={workspace.status} />
      <span className={styles.label}>{workspaceLabel(workspace.number)}</span>
      <span className={styles.name}>{workspace.name}</span>
      <span className={styles.agent}>
        <AgentMark agent={workspace.choice.agent} />
        {agents[workspace.choice.agent].name}
      </span>
      {props.stat ? (
        <DiffStat added={props.stat.added} removed={props.stat.removed} />
      ) : null}
      <span className={styles.state}>
        {listMarkLabel(workspace.github, workspace.status)}
      </span>
      <PersonAvatar initials={owner.initials} size={18} />
    </>
  )
  return props.to ? (
    <ScreenLink className={styles.line} to={props.to}>
      {content}
    </ScreenLink>
  ) : (
    <div className={styles.line}>{content}</div>
  )
}

/**
 * The block of the workspaces of an issue. Without one, it offers the
 * start, as `start` gives it. With some, it lists each with its live mark,
 * its agent, and the state of its pull request, and `more` adds one more.
 */
export function IssueWorkspaces(props: {
  workspaces: readonly string[]
  links?: Readonly<Record<string, string>>
  stats?: Readonly<Record<string, AttemptStat>>
  /** The start of the first workspace, such as Start workspace. */
  start: ReactNode
  /** The words under the start, such as where the workspace goes. */
  startNote?: string
  /** The link of Add a workspace, when the variation offers it. */
  more?: string
  title?: string
}) {
  const title = props.title ?? 'Workspaces'
  if (props.workspaces.length === 0) {
    return (
      <section aria-label={title} className={styles.block}>
        <h2 className={styles.heading}>{title}</h2>
        <div className={styles.empty}>
          <div className={styles.emptyText}>
            <span className={styles.emptyTitle}>No workspace yet</span>
            {props.startNote ? (
              <span className={styles.note}>{props.startNote}</span>
            ) : null}
          </div>
          {props.start}
        </div>
      </section>
    )
  }
  return (
    <section aria-label={title} className={styles.block}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>{title}</h2>
        {props.more ? (
          <ScreenLink asChild to={props.more}>
            <ActionButton icon={Plus} tone="plain">
              Add workspace
            </ActionButton>
          </ScreenLink>
        ) : null}
      </div>
      <div className={styles.lines}>
        {props.workspaces.map((key) => (
          <WorkspaceLine
            key={key}
            stat={props.stats?.[key]}
            to={props.links?.[key]}
            workspace={key}
          />
        ))}
      </div>
    </section>
  )
}
