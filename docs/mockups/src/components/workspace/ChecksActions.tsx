import { bannerSummary } from '../../fixtures/pullRequests'
import type { Workspace } from '../../fixtures/workspaces'
import { barGitHubLink } from '../../entries/components/workspace/barParts.mockup'
import { queueLine } from '../../entries/components/workspace/QueueBarParts.mockup'
import type { BarModel } from '../../../../../src/ui/components/workspace/barModel'
import styles from '../../../../../src/ui/components/workspace/BarActions.module.css'
import { BarButtons, BarMessage } from './BarActions'
import { ChecksBranches } from './ChecksBranches'
import { hasPullRequest } from './prStatus'

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
