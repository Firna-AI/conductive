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
} from '../../fixtures/mac'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { useMacApp, type MacChange } from './MacApp'
import styles from './AllowAllBar.module.css'

/** The result of a Stop or an Extend that the bar names. */
type BarResult = {
  icon: LucideIcon
  tone: string
  title: string
  detail: string
  /** The 15 minutes still run, so the bar keeps the time left. */
  running: boolean
}

/**
 * The result of Stop or Extend, in each state that shows one. A done Extend
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
}

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking: the time left of the 15 minutes, Extend, and Stop.
 * Extend sets the end to 15 minutes from now. It sits between the time left
 * and Stop, so Stop keeps its place at the end of the bar. After a Stop, the
 * bar names its result until the next Stop of the workspace, also when the
 * Stop ended the 15 minutes. A failed Extend names its result while the 15
 * minutes run, and a done Extend names none. A Stop or an Extend that failed
 * keeps the time left, Extend, and Stop, so the user can act again. A Stop
 * that the Mac made but did not save offers Try again, which saves it. Each
 * button links to the page of its result.
 */
export function AllowAllBar() {
  const change = useMacApp()?.change
  const result = change === undefined ? null : (results[change] ?? null)
  const running = result === null || result.running
  const left = change === 'extended' ? extendedLeft : allowAllLeft
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
          <span className={styles.left}>{left} left</span>
          <ScreenLink asChild to={paths.macExtend}>
            <ActionButton icon={TimerReset}>Extend</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.macStop}>
            <ActionButton icon={Square}>Stop</ActionButton>
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
