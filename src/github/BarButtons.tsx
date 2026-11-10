import {
  Archive,
  CircleAlert,
  Clock,
  GitBranchPlus,
  GitMerge,
} from 'lucide-react'
import styles from '../../docs/mockups/src/components/workspace/BarActions.module.css'
import {
  agentActionLabels,
  barLabels,
  mergeLabels,
} from '../../docs/mockups/src/components/workspace/barCopy'
import { agentIcons } from '../../docs/mockups/src/components/workspace/barIcons'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import { ActionButton } from './ActionButton'
import { classes, GitHubLink } from './bannerParts'
import type { BarControls, BarMessage } from './barView'

/**
 * One button of the bar. An agent action sends its fixed prompt, Merge
 * merges as the member, Continue moves the workspace to a new branch, and
 * Archive opens its question. The main action takes the primary tone.
 */
function BarButton(props: {
  action: BarAction
  onPress: (action: BarAction) => void
  touch: boolean
}) {
  const { action, touch } = props
  const press = () => props.onPress(action)
  switch (action.kind) {
    case 'agent':
      return (
        <ActionButton
          icon={agentIcons[action.action]}
          onPress={press}
          tone="primary"
          touch={touch}
        >
          {agentActionLabels[action.action]}
        </ActionButton>
      )
    case 'merge':
      return (
        <ActionButton
          busy={action.busy}
          icon={GitMerge}
          onPress={press}
          tone="primary"
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
          disabled={action.waiting}
          icon={GitBranchPlus}
          onPress={press}
          tone="primary"
          touch={touch}
        >
          {action.busy ? barLabels.continuing : barLabels.continue}
        </ActionButton>
      )
    case 'archive':
      return (
        <ActionButton
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
 * the link to GitHub last.
 */
export function BarButtons(props: { controls: BarControls; touch?: boolean }) {
  const { view, onAction } = props.controls
  const touch = props.touch ?? false
  return (
    <>
      {view.actions.map((action) => (
        <BarButton
          action={action}
          key={action.kind}
          onPress={onAction}
          touch={touch}
        />
      ))}
      {view.link ? (
        <GitHubLink
          href={view.link.href}
          label={view.link.label}
          touch={touch}
        />
      ) : null}
    </>
  )
}

/**
 * A message under the bar, such as a refusal of GitHub. It tints its whole
 * line, and its edges stay neutral. Another refusal of GitHub leads to the
 * pull request on GitHub, where GitHub names the reason.
 */
export function BarMessageLine(props: {
  message: BarMessage
  touch?: boolean
}) {
  const { message } = props
  const waits = message.tone === 'status'
  const Icon = waits ? Clock : CircleAlert
  return (
    <div
      className={classes(styles.message, !waits && styles.danger)}
      role={waits ? 'status' : 'alert'}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>{message.text}</span>
      {message.href ? (
        <GitHubLink
          href={message.href}
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
