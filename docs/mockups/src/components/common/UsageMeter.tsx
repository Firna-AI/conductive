import { classes } from './classes'
import styles from './UsageMeter.module.css'

/**
 * The state of a meter: in the pool, near or over it, or at a limit that
 * stops the use. The words beside the meter always say the state too.
 */
export type MeterTone = 'normal' | 'warning' | 'danger'

/**
 * A thin meter of use against what a plan includes. The fill and its track
 * are two steps of one colour, so the state reads across the whole bar. Use
 * over the limit fills the bar, and the text beside it gives the amount.
 */
export function UsageMeter(props: {
  label: string
  value: number
  max: number
  /** The amounts in words, such as "2,536 of 2,500 hours". */
  valueText: string
  tone: MeterTone
}) {
  const share = Math.min(props.value / props.max, 1)
  return (
    <div
      aria-label={props.label}
      aria-valuemax={props.max}
      aria-valuemin={0}
      aria-valuenow={Math.min(props.value, props.max)}
      aria-valuetext={props.valueText}
      className={classes(styles.track, styles[props.tone])}
      role="meter"
    >
      <span className={styles.fill} style={{ width: `${share * 100}%` }} />
    </div>
  )
}
