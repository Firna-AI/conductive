import {
  Archive,
  CircleAlert,
  Clock,
  GitBranchPlus,
  GitMerge,
  Info,
  type LucideIcon,
} from 'lucide-react'
import styles from '../../docs/mockups/src/components/workspace/BarActions.module.css'
import {
  agentActionLabels,
  barLabels,
  mergeLabels,
} from '../../docs/mockups/src/components/workspace/barCopy'
import { agentIcons } from '../../docs/mockups/src/components/workspace/barIcons'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import type { ButtonTint } from '../../docs/mockups/src/components/common/tint'
import { ActionButton } from './ActionButton'
import { classes, GitHubLink } from './bannerParts'
import { buttonKey, type CommandKeyOf } from './barKeys'
import type { BarControls, BarMessage } from './barView'

/**
 * One button of the bar. An agent action sends its fixed prompt, Merge
 * merges as the member, Continue moves the workspace to a new branch, and
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
          touch={touch}
        >
          {action.busy ? barLabels.merging : mergeLabels[action.method]}
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
 * The buttons and the link of the bar, in order: the main action first, and
 * the link to GitHub last. Without `link`, it shows no link: the desktop bar
 * of a pull request links its number instead. `keyOf` gives the key of
 * each command, which the tooltips name.
 */
export function BarButtons(props: {
  keyOf?: CommandKeyOf
  controls: BarControls
  touch?: boolean
  link?: boolean
}) {
  const { view, onAction } = props.controls
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
 * The actions of the bar at the top of the Checks tab of a phone, with the
 * message of the bar and its link to GitHub. The row above opens this tab,
 * because a button cannot sit inside the link of the row.
 */
export function ChecksActions(props: { controls: BarControls | null }) {
  const { controls } = props
  if (!controls) return null
  const { view } = controls
  if (!view.message && view.actions.length === 0 && !view.link) return null
  return (
    <div aria-label="Pull request actions" className={styles.top} role="group">
      {view.message ? <BarMessageLine message={view.message} touch /> : null}
      {view.actions.length > 0 || view.link ? (
        <div className={styles.buttons}>
          <BarButtons controls={controls} touch />
        </div>
      ) : null}
    </div>
  )
}
