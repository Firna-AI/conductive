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
  untilStop,
} from '../../fixtures/mac'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { useMacApp } from './MacApp'
import styles from './AllowAllBar.module.css'

/** The result of Stop or Keep, in each state that shows one. */
const results = {
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
  'keep-failed': {
    icon: CircleAlert,
    tone: styles.failed,
    title: 'Not kept',
    detail: failedMessage,
    running: true,
  },
} as const

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking: the time left of the 15 minutes, Keep until I stop,
 * and Stop. A grant until the user stops it (Mac until-stop decision 0)
 * shows Until you stop in place of the time left, and no Keep. Keep turns
 * the running 15 minutes into a grant until Stop (Mac until-stop decision
 * 2). After a Stop or a Keep, the bar names its result until the next
 * change of the grant, also when the Stop ended it. A change that failed
 * keeps the grant and its controls, so the user can act again. A Stop
 * that the Mac made but did not save offers Try again, which saves it.
 */
export function AllowAllBar(props: { untilStop?: boolean }) {
  const change = useMacApp()?.change
  const stop =
    change === 'stop-failed' ||
    change === 'stopped' ||
    change === 'stop-not-saved' ||
    change === 'keep-failed'
      ? results[change]
      : null
  const running = stop === null || stop.running
  const timed = props.untilStop !== true
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
          {timed ? (
            <>
              <span className={styles.left}>{allowAllLeft} left</span>
              <ActionButton>Keep until I stop</ActionButton>
            </>
          ) : (
            <span className={classes(styles.left, styles.open)}>
              {untilStop}
            </span>
          )}
          <ActionButton icon={Square} tone="outline">
            Stop
          </ActionButton>
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
