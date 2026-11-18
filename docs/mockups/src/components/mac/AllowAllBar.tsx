import {
  CircleAlert,
  CircleCheck,
  Square,
  Timer,
  TimerReset,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import {
  allowAllLeft,
  extendedLeft,
  failedMessage,
  notSavedMessage,
  untilStop,
} from '../../fixtures/mac'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { useMacApp, type MacChange } from './MacApp'
import styles from './AllowAllBar.module.css'

/** The result of Stop, Keep, or Extend that the bar names. */
type BarResult = {
  icon: LucideIcon
  tone: string
  title: string
  detail: string
  /** The 15 minutes still run, so the bar keeps the time left. */
  running: boolean
}

/**
 * The result of a grant change in each state that shows one. A done Extend
 * shows none, because the time left shows the change.
 */
const results: Partial<Record<MacChange, BarResult>> = {
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
  'extend-failed': {
    icon: CircleAlert,
    tone: styles.failed,
    title: 'Not extended',
    detail: failedMessage,
    running: true,
  },
  'keep-failed': {
    icon: CircleAlert,
    tone: styles.failed,
    title: 'Not kept',
    detail: failedMessage,
    running: true,
  },
}

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking: the time left, Extend, Keep until I stop, and Stop.
 * Extend resets the running 15 minutes from now and shows no done text.
 * A grant until the user stops it (Mac until-stop decision 0) shows Until
 * you stop in place of the time left, with no Keep or Extend. Keep turns
 * the running 15 minutes into a grant until Stop (Mac until-stop decision
 * 2). After a Stop or a Keep, the bar names its result until the next
 * change of the grant, also when the Stop ended it. A change that failed
 * keeps the grant and its controls, so the user can act again. A Stop
 * that the Mac made but did not save offers Try again, which saves it.
 */
export function AllowAllBar(props: { untilStop?: boolean }) {
  const change = useMacApp()?.change
  const result = change === undefined ? null : (results[change] ?? null)
  const running = result === null || result.running
  const left = change === 'extended' ? extendedLeft : allowAllLeft
  const timed = props.untilStop !== true
  const Icon = result?.icon ?? Timer
  return (
    <div
      className={classes(
        styles.bar,
        result !== null && styles.result,
        result?.tone,
      )}
      role="status"
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        {result ? (
          <>
            <span className={styles.title}>{result.title}</span> {result.detail}
          </>
        ) : (
          'Every command from this workspace runs on this Mac without asking.'
        )}
      </span>
      {running ? (
        <>
          {timed ? (
            <>
              <span className={styles.left}>{left} left</span>
              <ScreenLink asChild to={paths.macExtend}>
                <ActionButton icon={TimerReset} tone="outline">
                  Extend
                </ActionButton>
              </ScreenLink>
              <ScreenLink asChild to={paths.macAllowUntilStop}>
                <ActionButton>Keep until I stop</ActionButton>
              </ScreenLink>
            </>
          ) : (
            <span className={classes(styles.left, styles.open)}>
              {untilStop}
            </span>
          )}
          <ScreenLink asChild to={paths.macStop}>
            <ActionButton icon={Square} tone="outline">
              Stop
            </ActionButton>
          </ScreenLink>
        </>
      ) : null}
      {change === 'stop-not-saved' ? (
        <ScreenLink asChild to={paths.macStop}>
          <ActionButton
            accessibilityLabel={`Try again to stop ${checkoutAutocomplete.name}`}
          >
            Try again
          </ActionButton>
        </ScreenLink>
      ) : null}
    </div>
  )
}
