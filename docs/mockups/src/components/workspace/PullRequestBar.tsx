import { ChevronRight, GitBranch, GitPullRequest } from 'lucide-react'
import { bannerSummary, pullRequest } from '../../fixtures/pullRequests'
import { baseBranchOf, type Workspace } from '../../fixtures/workspaces'
import { barPaths, checksPaths } from '../../paths'
import { queuePaths } from '../../queuePaths'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import {
  barButtons,
  barMessage,
} from '../../entries/components/workspace/BarActions.mockup'
import {
  agentActionLabels,
  barLabels,
} from '../../../../../src/ui/components/workspace/barCopy'
import type { BarModel } from '../../../../../src/ui/components/workspace/barModel'
import {
  branches,
  pullRequestNumber,
  stateLabel,
} from '../../entries/components/workspace/barParts.mockup'
import { prStatusData } from '../../entries/components/workspace/barSchemas'
import { queueLine } from '../../entries/components/workspace/QueueBarParts.mockup'
import { hasPullRequest, prStatus } from './prStatus'
import { queueRowText } from '../../../../../src/ui/components/workspace/queueCopy'
import styles from './PullRequestBar.module.css'

/**
 * The buttons of the bar, which keep their size at its end. The bar has no
 * link to GitHub here: the number of a pull request opens it on GitHub.
 */
function Actions(props: { bar: BarModel }) {
  return (
    <span className={styles.actions}>
      <barButtons.Component bar={props.bar} />
    </span>
  )
}

/**
 * The pull request of the workspace branch, at the top of the right column:
 * its number, which opens it on GitHub, its checks and merge state, and its
 * main action. A branch without a pull request shows its target and Create
 * pull request. A message, such as a refusal of GitHub, shows under the bar,
 * and then the line of a queued workspace. Beside an action, a narrow bar
 * drops its detail.
 */
export function PullRequestBar(props: { bar: BarModel; workspace: Workspace }) {
  const { bar, workspace } = props
  const { banner } = bar
  const line = bar.queue?.line
  const buttons = bar.actions.length > 0 || bar.queue?.add === true
  const withActions = buttons && styles.withActions
  const message = (
    <>
      {bar.message ? (
        <barMessage.Component kind={bar.message} workspace={workspace} />
      ) : null}
      {line ? (
        <queueLine.Component
          github={bannerSummary(banner)}
          line={line}
          moklyInstance="queue-line"
          workspace={workspace}
        />
      ) : null}
    </>
  )
  if (!hasPullRequest(banner)) {
    const note =
      banner === 'none' ? barLabels.noPullRequest : barLabels.noCommits
    return (
      <>
        <div className={classes(styles.bar, withActions)}>
          <branches.Component workspace={workspace} />
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
  // A queued workspace conflicts with the branch below it in the queue.
  const status = prStatus(banner, line ? baseBranchOf(workspace) : undefined)
  return (
    <>
      <div className={classes(styles.bar, styles[status.tone], withActions)}>
        <pullRequestNumber.Component
          href={pullRequest.url}
          number={pullRequest.number}
        />
        <stateLabel.Component status={prStatusData(status)} />
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
 * without a pull request and without an action is not a link. A queued
 * workspace names its place.
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
  const line = bar.queue?.line
  return (
    <ScreenLink
      className={classes(styles.row, styles[status.tone])}
      to={line ? queuePaths.bar : checksPaths[banner]}
    >
      <span className={styles.number}>#{pullRequest.number}</span>
      <stateLabel.Component status={prStatusData(status)} />
      <span className={styles.spacer} />
      {line ? <span className={styles.queue}>{queueRowText(line)}</span> : null}
      <ChevronRight className={styles.muted} size={15} />
    </ScreenLink>
  )
}
