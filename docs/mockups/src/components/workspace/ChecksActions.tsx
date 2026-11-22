import { ArrowRight, GitBranch } from 'lucide-react'
import { bannerSummary } from '../../fixtures/pullRequests'
import { baseBranchOf, type Workspace } from '../../fixtures/workspaces'
import { barGitHubLink } from '../../entries/components/workspace/barParts.mockup'
import { queueLine } from '../../entries/components/workspace/QueueBarParts.mockup'
import { BarButtons, BarMessage } from './BarActions'
import type { BarModel } from './barModel'
import { hasPullRequest } from './prStatus'
import styles from './BarActions.module.css'

/**
 * The branch and its base at the top of the Checks tab of a phone, where
 * Create PR stands (decision 306). They take the parts of the desktop bar.
 * The names wrap, and the base keeps its arrow on a line of its own, so
 * each name shows in full: a phone has no tooltip.
 */
function ChecksBranches(props: { workspace: Workspace }) {
  const { workspace } = props
  return (
    <div className={styles.branches}>
      <GitBranch className={styles.branchIcon} size={13} />
      <span className={styles.names}>
        <span className={styles.branch}>{workspace.branch}</span>
        <span className={styles.base}>
          <ArrowRight className={styles.branchIcon} size={12} />
          <span className={styles.baseName}>{baseBranchOf(workspace)}</span>
        </span>
      </span>
    </div>
  )
}

/**
 * The top of the Checks tab of a phone: the message of the bar, the line of
 * a queued workspace, then its actions and its link to GitHub. While the
 * branch has no pull request, the
 * branch and its base stand above the actions, also when the bar has none.
 * The row above opens this tab, because a button cannot sit inside the link
 * of the row.
 */
export function ChecksActions(props: { bar: BarModel; workspace: Workspace }) {
  const { bar } = props
  const branches = !hasPullRequest(bar.banner)
  const buttons = bar.actions.length > 0 || bar.link !== undefined
  const line = bar.queue?.line
  if (!bar.message && !line && !buttons && !branches) return null
  return (
    <div aria-label="Pull request actions" className={styles.top} role="group">
      {bar.message ? (
        <BarMessage kind={bar.message} workspace={props.workspace} />
      ) : null}
      {line ? (
        <queueLine.Component
          github={bannerSummary(bar.banner)}
          line={line}
          moklyInstance="queue-line"
          workspace={props.workspace}
        />
      ) : null}
      {buttons || branches ? (
        <div className={styles.buttons}>
          {branches ? <ChecksBranches workspace={props.workspace} /> : null}
          <BarButtons bar={bar} />
          {bar.link ? <barGitHubLink.Component /> : null}
        </div>
      ) : null}
    </div>
  )
}
