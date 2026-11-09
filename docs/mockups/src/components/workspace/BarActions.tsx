import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  CircleAlert,
  Clock,
  GitBranchPlus,
  GitCompareArrows,
  GitMerge,
  GitPullRequestCreateArrow,
  MessageSquareCode,
  Upload,
  Wrench,
} from 'lucide-react'
import { pullRequest } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import {
  agentActionLabels,
  barLabels,
  barMessageText,
  mergeLabels,
  type AgentAction,
  type BarMessageKind,
} from './barCopy'
import type { BarAction, BarModel } from './barModel'
import { BarGitHubLink, GitHubLink } from './barParts'
import styles from './BarActions.module.css'

const agentIcons: Readonly<Record<AgentAction, LucideIcon>> = {
  'create-pull-request': GitPullRequestCreateArrow,
  'commit-and-push': Upload,
  'fix-checks': Wrench,
  'resolve-conflicts': GitCompareArrows,
  'address-review': MessageSquareCode,
}

/**
 * One button of the bar. An agent action sends its fixed prompt, Merge
 * merges as the viewer, Continue moves the workspace to a new branch, and
 * Archive opens its question. Each one leads to the screen that follows.
 */
function BarButton(props: { action: BarAction; localWork: boolean }) {
  const { action } = props
  switch (action.kind) {
    case 'agent':
      return (
        <ScreenLink asChild to={barPaths.sent[action.action]}>
          <ActionButton icon={agentIcons[action.action]} tone="primary">
            {agentActionLabels[action.action]}
          </ActionButton>
        </ScreenLink>
      )
    case 'merge':
      return (
        <ScreenLink asChild to={barPaths.merging}>
          <ActionButton busy={action.busy} icon={GitMerge} tone="primary">
            {action.busy ? barLabels.merging : mergeLabels[action.method]}
          </ActionButton>
        </ScreenLink>
      )
    case 'continue':
      // While a turn runs, Continue is not available.
      return action.waiting ? (
        <ActionButton disabled icon={GitBranchPlus} tone="primary">
          {barLabels.continue}
        </ActionButton>
      ) : (
        <ScreenLink
          asChild
          to={props.localWork ? barPaths.continueQuestion : barPaths.continuing}
        >
          <ActionButton busy={action.busy} icon={GitBranchPlus} tone="primary">
            {action.busy ? barLabels.continuing : barLabels.continue}
          </ActionButton>
        </ScreenLink>
      )
    case 'archive':
      return action.disabled ? (
        <ActionButton disabled icon={Archive}>
          {barLabels.archive}
        </ActionButton>
      ) : (
        <ScreenLink asChild to={paths.archivePushed}>
          <ActionButton icon={Archive}>{barLabels.archive}</ActionButton>
        </ScreenLink>
      )
  }
}

/** The buttons of the bar, in order: the main action first. */
export function BarButtons(props: { bar: BarModel }) {
  return props.bar.actions.map((action) => (
    <BarButton
      action={action}
      key={action.kind}
      localWork={props.bar.localWork}
    />
  ))
}

/**
 * A message under the bar, such as a refusal of GitHub. It tints its whole
 * line, and its edges stay neutral. Another refusal of GitHub leads to the
 * pull request on GitHub, where GitHub names the reason.
 */
export function BarMessage(props: {
  kind: BarMessageKind
  workspace: Workspace
}) {
  const { workspace } = props
  const waits = props.kind === 'continue-waits'
  const Icon = waits ? Clock : CircleAlert
  const branches = {
    branch: workspace.branch,
    base: repositories[workspace.repository].defaultBranch,
  }
  return (
    <div
      className={classes(styles.message, !waits && styles.danger)}
      role={waits ? 'status' : 'alert'}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        {barMessageText(props.kind, branches)}
      </span>
      {props.kind === 'merge-refused' ? (
        <GitHubLink href={pullRequest.url} label={barLabels.openOnGitHub} />
      ) : null}
    </div>
  )
}

/**
 * The actions of the bar at the top of the Checks tab of a phone, with the
 * message of the bar and its link to GitHub. The row above opens this tab,
 * because a button cannot sit inside the link of the row.
 */
export function ChecksActions(props: { bar: BarModel; workspace: Workspace }) {
  const { bar } = props
  if (!bar.message && bar.actions.length === 0 && !bar.link) return null
  return (
    <div aria-label="Pull request actions" className={styles.top} role="group">
      {bar.message ? (
        <BarMessage kind={bar.message} workspace={props.workspace} />
      ) : null}
      <div className={styles.buttons}>
        <BarButtons bar={bar} />
        {bar.link ? (
          <BarGitHubLink kind={bar.link} workspace={props.workspace} />
        ) : null}
      </div>
    </div>
  )
}
