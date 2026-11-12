import { ChevronRight, GitBranch, GitPullRequest } from 'lucide-react'
import { pullRequest } from '../../fixtures/pullRequests'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, checksPaths } from '../../paths'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { BarButtons, BarMessage } from './BarActions'
import { agentActionLabels, barLabels } from './barCopy'
import type { BarModel } from './barModel'
import { Branches, PullRequestNumber, StateLabel } from './barParts'
import { hasPullRequest, prStatus } from './prStatus'
import styles from './PullRequestBar.module.css'

/**
 * The buttons of the bar, which keep their size at its end. The bar has no
 * link to GitHub here: the number of a pull request opens it on GitHub.
 */
function Actions(props: { bar: BarModel }) {
  return (
    <span className={styles.actions}>
      <BarButtons bar={props.bar} />
    </span>
  )
}

/**
 * The pull request of the workspace branch, at the top of the right column:
 * its number, which opens it on GitHub, its checks and merge state, and its
 * main action. A branch without a pull request shows its target and Create
 * pull request. A message, such as a refusal of GitHub, shows under the bar.
 * Beside an action, a narrow bar drops its detail.
 */
export function PullRequestBar(props: { bar: BarModel; workspace: Workspace }) {
  const { bar, workspace } = props
  const { banner } = bar
  const withActions = bar.actions.length > 0 && styles.withActions
  const message = bar.message ? (
    <BarMessage kind={bar.message} workspace={workspace} />
  ) : null
  if (!hasPullRequest(banner)) {
    const note =
      banner === 'none' ? barLabels.noPullRequest : barLabels.noCommits
    return (
      <>
        <div className={classes(styles.bar, withActions)}>
          <Branches workspace={workspace} />
          {bar.actions.length === 0 ? (
            <span className={styles.note}>{note}</span>
          ) : (
            <Actions bar={bar} />
          )}
        </div>
        {message}
      </>
    )
  }
  const status = prStatus(banner)
  return (
    <>
      <div className={classes(styles.bar, styles[status.tone], withActions)}>
        <PullRequestNumber href={pullRequest.url} number={pullRequest.number} />
        <StateLabel status={status} />
        {status.detail ? (
          <span className={styles.detail}>{status.detail}</span>
        ) : null}
        <Actions bar={bar} />
      </div>
      {message}
    </>
  )
}

/**
 * The compact pull request row at the top of a workspace on a phone. It
 * opens the Checks tab, whose top holds the actions of the bar. A branch
 * without a pull request and without an action is not a link.
 */
export function PullRequestRow(props: { bar: BarModel }) {
  const { bar } = props
  const { banner } = bar
  if (!hasPullRequest(banner)) {
    if (bar.actions.length === 0) {
      return (
        <div className={styles.row}>
          <GitBranch className={styles.muted} size={14} />
          <span className={styles.rowText}>
            {banner === 'none' ? barLabels.noPullRequest : barLabels.noCommits}
          </span>
        </div>
      )
    }
    const to =
      banner === 'none' ? checksPaths.none : barPaths.noCommitsLocalWork
    return (
      <ScreenLink className={styles.row} to={to}>
        <GitPullRequest className={styles.muted} size={14} />
        <span className={styles.rowText}>
          {agentActionLabels['create-pull-request']}
        </span>
        <ChevronRight className={styles.muted} size={15} />
      </ScreenLink>
    )
  }
  const status = prStatus(banner)
  return (
    <ScreenLink
      className={classes(styles.row, styles[status.tone])}
      to={checksPaths[banner]}
    >
      <span className={styles.number}>#{pullRequest.number}</span>
      <StateLabel status={status} />
      <span className={styles.spacer} />
      <ChevronRight className={styles.muted} size={15} />
    </ScreenLink>
  )
}
