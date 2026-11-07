import {
  CircleAlert,
  CircleCheck,
  Square,
  Timer,
  TriangleAlert,
} from 'lucide-react'
import {
  allowAllLeft,
  failedMessage,
  notSavedMessage,
} from '../../fixtures/mac'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { useMacApp } from './MacApp'
import styles from './AllowAllBar.module.css'

/** The result of Stop, in each state that shows one. */
const stops = {
  'stop-failed': {
    icon: CircleAlert,
    tone: styles.failed,
    title: 'Not stopped',
    detail: failedMessage,
    running: true,
  },
  stopped: {
    icon: CircleCheck,
    tone: styles.done,
    title: 'Stopped',
    detail: 'Each command from this workspace asks first.',
    running: false,
  },
  'stop-not-saved': {
    icon: TriangleAlert,
    tone: styles.notSaved,
    title: 'Stopped, not saved',
    detail: notSavedMessage,
    running: false,
  },
} as const

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking: the time left of the 15 minutes, and Stop. After a
 * Stop, the bar names its result until the next Stop of the workspace,
 * also when the Stop ended the 15 minutes. A Stop that failed keeps the
 * time left and Stop, so the user can stop again. A Stop that the Mac made
 * but did not save offers Try again, which saves it.
 */
export function AllowAllBar() {
  const change = useMacApp()?.change
  const stop =
    change === 'stop-failed' ||
    change === 'stopped' ||
    change === 'stop-not-saved'
      ? stops[change]
      : null
  const running = stop === null || stop.running
  const Icon = stop?.icon ?? Timer
  return (
    <div
      className={classes(
        styles.bar,
        stop !== null && styles.result,
        stop?.tone,
      )}
      role="status"
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        {stop ? (
          <>
            <span className={styles.title}>{stop.title}</span> {stop.detail}
          </>
        ) : (
          'Every command from this workspace runs on this Mac without asking.'
        )}
      </span>
      {running ? (
        <>
          <span className={styles.left}>{allowAllLeft} left</span>
          <ActionButton icon={Square}>Stop</ActionButton>
        </>
      ) : null}
      {change === 'stop-not-saved' ? (
        <ActionButton
          accessibilityLabel={`Try again to stop ${checkoutAutocomplete.name}`}
        >
          Try again
        </ActionButton>
      ) : null}
    </div>
  )
}
