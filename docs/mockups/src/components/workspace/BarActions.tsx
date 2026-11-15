import {
  Archive,
  CircleAlert,
  Clock,
  GitBranchPlus,
  GitMerge,
} from 'lucide-react'
import { pullRequest } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { ShortcutTip } from '../common/ShortcutTip'
import { TintedTheme, type ButtonTint } from '../common/tint'
import {
  agentActionCommand,
  agentActionLabels,
  barLabels,
  barMessageText,
  mergeLabels,
  type BarMessageKind,
} from './barCopy'
import { agentIcons } from './barIcons'
import type { BarAction, BarModel } from './barModel'
import { BarGitHubLink, GitHubLink } from './barParts'
import { barTint } from './prStatus'
import styles from './BarActions.module.css'

/**
 * One button of the bar. An agent action sends its fixed prompt, Merge
 * merges as the viewer, Continue moves the workspace to a new branch, and
 * Archive archives the workspace at once. Each one leads to the screen that
 * follows. The main action takes the tint of the bar, outside its link,
 * because the link of the mockups needs the button as its own child. On
 * desktop, the tooltip of a button that takes a click names the key of its
 * command, such as "Create PR (⇧⌘P)". Each button without a tint takes the
 * outline tone, so the colour of the bar shows through it.
 */
function BarButton(props: {
  action: BarAction
  localWork: boolean
  tint: ButtonTint | undefined
}) {
  const { action, tint } = props
  // Only a tint fills the main action. A bar without one shows the outline.
  const tone = tint ? 'primary' : 'outline'
  switch (action.kind) {
    case 'agent':
      return (
        <ShortcutTip
          command={agentActionCommand(action.action)}
          label={agentActionLabels[action.action]}
        >
          <TintedTheme tint={tint}>
            <ScreenLink asChild to={barPaths.sent[action.action]}>
              <ActionButton icon={agentIcons[action.action]} tone={tone}>
                {agentActionLabels[action.action]}
              </ActionButton>
            </ScreenLink>
          </TintedTheme>
        </ShortcutTip>
      )
    case 'merge':
      return (
        <ShortcutTip
          command="merge-pull-request"
          label={mergeLabels[action.method]}
          off={action.busy}
        >
          <TintedTheme tint={tint}>
            <ScreenLink asChild to={barPaths.merging}>
              <ActionButton busy={action.busy} icon={GitMerge} tone={tone}>
                {action.busy ? barLabels.merging : mergeLabels[action.method]}
              </ActionButton>
            </ScreenLink>
          </TintedTheme>
        </ShortcutTip>
      )
    case 'continue':
      // While a turn runs, Continue is not available.
      return (
        <ShortcutTip
          command="continue-after-merge"
          label={barLabels.continue}
          off={action.waiting || action.busy}
        >
          <TintedTheme tint={tint}>
            {action.waiting ? (
              <ActionButton disabled icon={GitBranchPlus} tone={tone}>
                {barLabels.continue}
              </ActionButton>
            ) : (
              <ScreenLink
                asChild
                to={
                  props.localWork
                    ? barPaths.continueQuestion
                    : barPaths.continuing
                }
              >
                <ActionButton
                  busy={action.busy}
                  icon={GitBranchPlus}
                  tone={tone}
                >
                  {action.busy ? barLabels.continuing : barLabels.continue}
                </ActionButton>
              </ScreenLink>
            )}
          </TintedTheme>
        </ShortcutTip>
      )
    case 'archive':
      return (
        <ShortcutTip
          command="archive-workspace"
          label={barLabels.archive}
          off={action.busy || action.disabled}
        >
          {action.disabled ? (
            <ActionButton disabled icon={Archive} tone="outline">
              {barLabels.archive}
            </ActionButton>
          ) : (
            <ScreenLink asChild to={paths.justArchived}>
              <ActionButton busy={action.busy} icon={Archive} tone="outline">
                {barLabels.archive}
              </ActionButton>
            </ScreenLink>
          )}
        </ShortcutTip>
      )
  }
}

/** The buttons of the bar, in order: the main action first. */
export function BarButtons(props: { bar: BarModel }) {
  const tint = barTint(props.bar.banner)
  return props.bar.actions.map((action) => (
    <BarButton
      action={action}
      key={action.kind}
      localWork={props.bar.localWork}
      tint={tint}
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
        {bar.link ? <BarGitHubLink /> : null}
      </div>
    </div>
  )
}
