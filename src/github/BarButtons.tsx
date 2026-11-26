import {
  Archive,
  ArrowRight,
  CircleAlert,
  Clock,
  GitBranch,
  GitBranchPlus,
  GitMerge,
  GitPullRequestArrow,
  Info,
  type LucideIcon,
} from 'lucide-react'
import styles from '../ui/components/workspace/BarActions.module.css'
import {
  agentActionLabels,
  barLabels,
  mergeLabels,
} from '../ui/components/workspace/barCopy'
import { agentIcons } from '../ui/components/workspace/barIcons'
import type { BarAction } from '../ui/components/workspace/barModel'
import { mergeButtonLabel } from '../ui/components/workspace/queueCopy'
import type { ButtonTint } from '../ui/components/common/tint'
import { ActionButton } from './ActionButton'
import { classes, GitHubLink } from './bannerParts'
import { buttonKey, type CommandKeyOf } from './barKeys'
import type { BarBranches, BarControls, BarMessage } from './barView'
import { QueueAddButton, QueueLine } from './QueueBarParts'

/**
 * One button of the bar. An agent action sends its fixed prompt, Merge
 * merges as the member, Ready for review marks a draft ready as the member,
 * Continue moves the workspace to a new branch, and
 * Archive archives the workspace at once. The main action takes the tint of
 * a tinted bar. On a bar without a tint, it takes the outline tone, as
 * Archive does, so the bar shows no primary fill. A button that takes a
 * click names the key of its command in its tooltip.
 */
function BarButton(props: {
  action: BarAction
  onPress: (action: BarAction) => void
  touch: boolean
  tint: ButtonTint | null
  keyOf?: CommandKeyOf
}) {
  const { action, touch, tint } = props
  const press = () => props.onPress(action)
  const commandKey = buttonKey(action, props.keyOf)
  switch (action.kind) {
    case 'agent':
      return (
        <ActionButton
          commandKey={commandKey}
          icon={agentIcons[action.action]}
          onPress={press}
          tint={tint}
          touch={touch}
        >
          {agentActionLabels[action.action]}
        </ActionButton>
      )
    case 'merge':
      return (
        <ActionButton
          busy={action.busy}
          commandKey={commandKey}
          icon={GitMerge}
          onPress={press}
          tint={tint}
          tooltip={
            (action.below !== undefined || action.stackCount !== undefined) &&
            !action.busy &&
            !touch
              ? mergeLabels[action.method]
              : undefined
          }
          touch={touch}
        >
          {action.busy
            ? barLabels.merging
            : mergeButtonLabel(action.method, action.below, action.stackCount)}
        </ActionButton>
      )
    case 'ready':
      return (
        <ActionButton
          busy={action.busy}
          commandKey={commandKey}
          icon={GitPullRequestArrow}
          onPress={press}
          tint={tint}
          touch={touch}
        >
          {action.busy ? barLabels.markingReady : barLabels.readyForReview}
        </ActionButton>
      )
    case 'continue':
      // While a turn runs, Continue is not available.
      return (
        <ActionButton
          busy={action.busy}
          commandKey={commandKey}
          disabled={action.waiting}
          icon={GitBranchPlus}
          onPress={press}
          tint={tint}
          touch={touch}
        >
          {action.busy ? barLabels.continuing : barLabels.continue}
        </ActionButton>
      )
    case 'archive':
      return (
        <ActionButton
          busy={action.busy}
          commandKey={commandKey}
          disabled={action.disabled}
          icon={Archive}
          onPress={press}
          touch={touch}
        >
          {barLabels.archive}
        </ActionButton>
      )
  }
}

/**
 * The buttons and the link of the bar, in order: the main action first,
 * then Add to merge queue when the pull request can join the queue, and
 * the link to GitHub last. Without `link`, it shows no link: the desktop
 * bar of a pull request links its number instead. `keyOf` gives the key of
 * each command, which the tooltips name.
 */
export function BarButtons(props: {
  keyOf?: CommandKeyOf
  controls: BarControls
  touch?: boolean
  link?: boolean
}) {
  const { view, onAction, onQueue } = props.controls
  const touch = props.touch ?? false
  return (
    <>
      {view.actions.map((action) => (
        <BarButton
          action={action}
          key={action.kind}
          keyOf={props.keyOf}
          onPress={onAction}
          tint={view.tint}
          touch={touch}
        />
      ))}
      {view.queue?.add ? (
        <QueueAddButton
          beside={view.actions.length > 0}
          busy={view.queue.adding}
          onPress={() => onQueue?.('add')}
          touch={touch}
        />
      ) : null}
      {view.link && props.link !== false ? (
        <GitHubLink
          href={view.link.href}
          keyOf={props.keyOf}
          label={view.link.label}
          touch={touch}
        />
      ) : null}
    </>
  )
}

/** The mark of each tone of a message under the bar. */
const messageIcons: Readonly<Record<BarMessage['tone'], LucideIcon>> = {
  status: Clock,
  info: Info,
  danger: CircleAlert,
}

/**
 * A message under the bar, such as a refusal of GitHub. It tints its whole
 * line, and its edges stay neutral. Another refusal of GitHub leads to the
 * pull request on GitHub, where GitHub names the reason. A wait and a base
 * that moved to the default branch are a status, not a refusal.
 */
export function BarMessageLine(props: {
  message: BarMessage
  touch?: boolean
  keyOf?: CommandKeyOf
}) {
  const { message } = props
  const danger = message.tone === 'danger'
  const Icon = messageIcons[message.tone]
  return (
    <div
      className={classes(styles.message, danger && styles.danger)}
      role={danger ? 'alert' : 'status'}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>{message.text}</span>
      {message.href ? (
        <GitHubLink
          href={message.href}
          keyOf={props.keyOf}
          label={barLabels.openOnGitHub}
          touch={props.touch}
        />
      ) : null}
    </div>
  )
}

/**
 * The branch and its base at the top of the Checks tab of a phone, where
 * Create PR stands (decision 306). They take the parts of the desktop bar:
 * the branch icon, the branch, an arrow, and the base. The names wrap, and
 * the base keeps its arrow on a line of its own, so each name shows in
 * full: a phone has no tooltip.
 */
function ChecksBranches(props: { branches: BarBranches }) {
  const { branch, base } = props.branches
  return (
    <div className={styles.branches}>
      <GitBranch aria-hidden className={styles.branchIcon} size={13} />
      <span className={styles.names}>
        <span className={styles.branch}>{branch}</span>
        <span className={styles.base}>
          <ArrowRight aria-hidden className={styles.branchIcon} size={12} />
          <span className={styles.baseName}>{base}</span>
        </span>
      </span>
    </div>
  )
}

/**
 * The top of the Checks tab of a phone: the message of the bar, the line
 * of a queued workspace, then its actions and its link to GitHub. While the
 * branch has no pull request, the branch and its base stand above the
 * actions, also when the bar has none. The row above opens this tab,
 * because a button cannot sit inside the link of the row.
 */
export function ChecksActions(props: { controls: BarControls | null }) {
  const { controls } = props
  if (!controls) return null
  const { view } = controls
  const line = view.queue?.line ?? null
  const buttons =
    view.actions.length > 0 || view.link !== null || view.queue?.add === true
  if (!view.message && !line && !buttons && !view.branches) return null
  return (
    <div aria-label="Pull request actions" className={styles.top} role="group">
      {view.message ? <BarMessageLine message={view.message} touch /> : null}
      {line ? (
        <QueueLine
          line={line}
          onRemove={() => controls.onQueue?.('remove')}
          touch
        />
      ) : null}
      {buttons || view.branches ? (
        <div className={styles.buttons}>
          {view.branches ? <ChecksBranches branches={view.branches} /> : null}
          <BarButtons controls={controls} touch />
        </div>
      ) : null}
    </div>
  )
}
