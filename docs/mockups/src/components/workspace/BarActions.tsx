import type { LucideIcon } from 'lucide-react'
import { CircleAlert, Clock, Info } from 'lucide-react'
import { pullRequest } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, paths } from '../../paths'
import { queuePaths } from '../../queuePaths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { shortcutTip } from '../../entries/components/common/ShortcutTip.mockup'
import {
  TintedTheme,
  type ButtonTint,
} from '../../../../../src/ui/components/common/tint'
import {
  agentActionCommand,
  agentActionLabels,
  barLabels,
  barMessageText,
  type AgentAction,
  type BarMessageKind,
} from '../../../../../src/ui/components/workspace/barCopy'
import { agentIcons } from '../../../../../src/ui/components/workspace/barIcons'
import type {
  BarAction,
  BarModel,
} from '../../../../../src/ui/components/workspace/barModel'
import { mergeButtonLabel } from '../../../../../src/ui/components/workspace/queueCopy'
import { QueueAddButton } from './QueueBarParts'
import { githubLink } from '../../entries/components/workspace/barParts.mockup'
import { barTint } from './prStatus'
import { iconKeyOf } from '../../entries/components/common/icons'
import styles from '../../../../../src/ui/components/workspace/BarActions.module.css'

/**
 * One button of the bar. An agent action sends its fixed prompt, Merge
 * merges as the viewer, Ready for review marks a draft ready as the
 * viewer, Continue moves the workspace to a new branch, and
 * Archive archives the workspace at once. Each one leads to the screen that
 * follows. The main action takes the tint of the bar, outside its link,
 * because the link of the mockups needs the button as its own child. On
 * desktop, the tooltip of a button that takes a click names the key of its
 * command, such as "Create PR (⇧⌘P)". Each button without a tint takes the
 * outline tone, so the colour of the bar shows through it. On a queued
 * workspace, Resolve conflicts asks for a rebase, and Merge goes through
 * the queue with the layers below it.
 */
function BarButton(props: {
  action: BarAction
  localWork: boolean
  tint: ButtonTint | undefined
  queued: boolean
}) {
  const { action, tint } = props
  // Only a tint fills the main action. A bar without one shows the outline.
  const tone = tint ? 'primary' : 'outline'
  switch (action.kind) {
    case 'agent':
      return (
        <shortcutTip.Component
          command={agentActionCommand(action.action)}
          label={agentActionLabels[action.action]}
          moklyInstance="agent-tip"
        >
          <TintedTheme tint={tint}>
            <ScreenLink asChild to={sentPath(action.action, props.queued)}>
              <actionButton.Component
                icon={iconKeyOf(agentIcons[action.action])}
                moklyInstance={`agent-${action.action}`}
                tone={tone}
              >
                {agentActionLabels[action.action]}
              </actionButton.Component>
            </ScreenLink>
          </TintedTheme>
        </shortcutTip.Component>
      )
    case 'merge': {
      const label = mergeButtonLabel(
        action.method,
        action.below,
        action.stackCount,
      )
      const to =
        action.below === undefined ? barPaths.merging : queuePaths.merging
      return (
        <shortcutTip.Component
          command="merge-pull-request"
          label={label}
          moklyInstance="merge-tip"
          off={action.busy}
        >
          <TintedTheme tint={tint}>
            <ScreenLink asChild to={to}>
              <actionButton.Component
                busy={action.busy}
                icon="git-merge"
                moklyInstance="merge-pull-request"
                tone={tone}
              >
                {action.busy ? barLabels.merging : label}
              </actionButton.Component>
            </ScreenLink>
          </TintedTheme>
        </shortcutTip.Component>
      )
    }
    case 'ready':
      return (
        <shortcutTip.Component
          command="mark-ready-for-review"
          label={barLabels.readyForReview}
          moklyInstance="ready-tip"
          off={action.busy}
        >
          <TintedTheme tint={tint}>
            <ScreenLink asChild to={barPaths.markingReady}>
              <actionButton.Component
                busy={action.busy}
                icon="git-pull-request-arrow"
                moklyInstance="ready-for-review"
                tone={tone}
              >
                {action.busy
                  ? barLabels.markingReady
                  : barLabels.readyForReview}
              </actionButton.Component>
            </ScreenLink>
          </TintedTheme>
        </shortcutTip.Component>
      )
    case 'continue':
      // While a turn runs, Continue is not available.
      return (
        <shortcutTip.Component
          command="continue-after-merge"
          label={barLabels.continue}
          moklyInstance="continue-tip"
          off={action.waiting || action.busy}
        >
          <TintedTheme tint={tint}>
            {action.waiting ? (
              <actionButton.Component
                disabled
                icon="git-branch-plus"
                moklyInstance="continue-after-merge"
                tone={tone}
              >
                {barLabels.continue}
              </actionButton.Component>
            ) : (
              <ScreenLink
                asChild
                to={
                  props.localWork
                    ? barPaths.continueQuestion
                    : barPaths.continuing
                }
              >
                <actionButton.Component
                  busy={action.busy}
                  icon="git-branch-plus"
                  moklyInstance="continue-after-merge"
                  tone={tone}
                >
                  {action.busy ? barLabels.continuing : barLabels.continue}
                </actionButton.Component>
              </ScreenLink>
            )}
          </TintedTheme>
        </shortcutTip.Component>
      )
    case 'archive':
      return (
        <shortcutTip.Component
          command="archive-workspace"
          label={barLabels.archive}
          moklyInstance="archive-tip"
          off={action.busy || action.disabled}
        >
          {action.disabled ? (
            <actionButton.Component
              disabled
              icon="archive"
              moklyInstance="archive-workspace"
              tone="outline"
            >
              {barLabels.archive}
            </actionButton.Component>
          ) : (
            <ScreenLink asChild to={paths.justArchived}>
              <actionButton.Component
                busy={action.busy}
                icon="archive"
                moklyInstance="archive-workspace"
                tone="outline"
              >
                {barLabels.archive}
              </actionButton.Component>
            </ScreenLink>
          )}
        </shortcutTip.Component>
      )
  }
}

/**
 * The screen of the message that an agent action sends. On a queued
 * workspace, Resolve conflicts sends the rebase variant of its prompt.
 */
function sentPath(action: AgentAction, queued: boolean): string {
  if (queued && action === 'resolve-conflicts') return queuePaths.rebase
  return barPaths.sent[action]
}

/**
 * The buttons of the bar, in order: the main action first, then Add to
 * merge queue when the pull request can join the queue.
 */
export function BarButtons(props: { bar: BarModel }) {
  const { bar } = props
  const tint = barTint(bar.banner)
  return (
    <>
      {bar.actions.map((action) => (
        <BarButton
          action={action}
          key={action.kind}
          localWork={bar.localWork}
          queued={bar.queue?.line !== undefined}
          tint={tint}
        />
      ))}
      {bar.queue?.add ? (
        <QueueAddButton beside={bar.actions.length > 0} />
      ) : null}
    </>
  )
}

/** The icon of each status under the bar. A refusal shows `CircleAlert`. */
const statusIcons: Partial<Record<BarMessageKind, LucideIcon>> = {
  'continue-waits': Clock,
  'base-moved': Info,
  'merge-stack-held': Info,
}

/**
 * A message under the bar, such as a refusal of GitHub. It tints its whole
 * line, and its edges stay neutral. Another refusal of GitHub leads to the
 * pull request on GitHub, where GitHub names the reason. A wait and a base
 * that moved to the default branch are a status, not a refusal.
 */
export function BarMessage(props: {
  kind: BarMessageKind
  workspace: Workspace
}) {
  const { workspace } = props
  const StatusIcon = statusIcons[props.kind]
  const status = StatusIcon !== undefined
  const Icon = StatusIcon ?? CircleAlert
  const branches = {
    branch: workspace.branch,
    base: repositories[workspace.repository].defaultBranch,
    moved: workspace.movedBase,
  }
  return (
    <div
      className={classes(styles.message, !status && styles.danger)}
      role={status ? 'status' : 'alert'}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        {barMessageText(props.kind, branches)}
      </span>
      {props.kind === 'merge-refused' || props.kind === 'ready-refused' ? (
        <githubLink.Component
          href={pullRequest.url}
          label={barLabels.openOnGitHub}
        />
      ) : null}
    </div>
  )
}
