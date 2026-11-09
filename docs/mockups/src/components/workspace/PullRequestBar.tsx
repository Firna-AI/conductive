import { ChevronRight, GitBranch, GitPullRequest } from 'lucide-react'
import { pullRequest, type BannerState } from '../../fixtures/pullRequests'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, checksPaths } from '../../paths'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { BarButtons, BarMessage } from './BarActions'
import { agentActionLabels, barLabels } from './barCopy'
import type { BarModel } from './barModel'
import { BarGitHubLink, Branches, StateLabel } from './barParts'
import { prStatus, type PullRequestState } from './prStatus'
import styles from './PullRequestBar.module.css'

/** The buttons and the link of the bar, which keep their size at its end. */
function Actions(props: { bar: BarModel; workspace: Workspace }) {
  const { bar } = props
  return (
    <span className={styles.actions}>
      <BarButtons bar={bar} />
      {bar.link ? (
        <BarGitHubLink kind={bar.link} workspace={props.workspace} />
      ) : null}
    </span>
  )
}

/** A branch with a pull request, in any state of that pull request. */
function hasPullRequest(banner: BannerState): banner is PullRequestState {
  return banner !== 'none' && banner !== 'no-commits'
}

/**
 * The pull request of the workspace branch, at the top of the right column:
 * its number, its checks and merge state, its main action, and a link to
 * GitHub. A branch without a pull request shows its target, Create pull
 * request, and a link that creates it on GitHub once GitHub has a commit.
 * A message, such as a refusal of GitHub, shows under the bar. Beside an
 * action, a narrow bar drops its detail and keeps only the GitHub mark of
 * its link.
 */
export function PullRequestBar(props: { bar: BarModel; workspace: Workspace }) {
  const { bar, workspace } = props
  const { banner } = bar
  const withActions = bar.actions.length > 0 && styles.withActions
  const message = bar.message ? (
    <BarMessage kind={bar.message} workspace={workspace} />
  ) : null
  if (!hasPullRequest(banner)) {
    const empty = bar.actions.length === 0 && !bar.link
    return (
      <>
        <div className={classes(styles.bar, withActions)}>
          <Branches workspace={workspace} />
          {empty ? (
            <span className={styles.note}>{barLabels.noCommits}</span>
          ) : (
            <Actions bar={bar} workspace={workspace} />
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
        <span className={styles.number}>#{pullRequest.number}</span>
        <StateLabel status={status} />
        {status.detail ? (
          <span className={styles.detail}>{status.detail}</span>
        ) : null}
        <Actions bar={bar} workspace={workspace} />
      </div>
      {message}
    </>
  )
}

/**
 * The compact pull request row at the top of a workspace on a phone. It
 * opens the Checks tab, whose top holds the actions of the bar. A branch
 * without a commit and without local work is not a link.
 */
export function PullRequestRow(props: { bar: BarModel }) {
  const { bar } = props
  const { banner } = bar
  if (!hasPullRequest(banner)) {
    if (banner === 'no-commits' && bar.actions.length === 0) {
      return (
        <div className={styles.row}>
          <GitBranch className={styles.muted} size={14} />
          <span className={styles.rowText}>{barLabels.noCommits}</span>
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
