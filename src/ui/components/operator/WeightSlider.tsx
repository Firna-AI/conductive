import { noop } from '../../noop'
import { classes } from '../common/classes'
import styles from './WeightSlider.module.css'

/** A provider account by its ID, and its share of new orgs in whole percent. */
export type AccountWeight = { id: string; weight: number }

/** One end of the slider: the ID of the account, and its share. */
function End(props: { weight: AccountWeight; end?: boolean }) {
  return (
    <span className={classes(styles.end, props.end && styles.right)}>
      <span className={styles.account}>{props.weight.id}</span>
      <span className={styles.percent}>{props.weight.weight}%</span>
    </span>
  )
}

/**
 * The weights of new orgs between two provider accounts, as one slider.
 * The first account fills the track from the left up to the thumb, and the
 * second account gets the rest, so the two always add up to 100%. Each end
 * names its account and its share. `@firna/ui` has no slider, so this
 * draws the range control of the browser in the accent colour. Its spoken
 * value names both accounts. `disabled` turns it off, such as while a save
 * runs. It imports no fixture, so the app uses it too.
 */
export function WeightSlider(props: {
  label: string
  first: AccountWeight
  second: AccountWeight
  onChange?: (firstWeight: number) => void
  disabled?: boolean
}) {
  const { first, second } = props
  const onChange = props.onChange
  return (
    <div className={styles.slider}>
      <div aria-hidden className={styles.ends}>
        <End weight={first} />
        <End end weight={second} />
      </div>
      <input
        aria-label={props.label}
        aria-valuetext={`${first.id} ${first.weight}%, ${second.id} ${second.weight}%`}
        className={styles.range}
        disabled={props.disabled}
        max={100}
        min={0}
        onChange={
          onChange ? (event) => onChange(Number(event.target.value)) : noop
        }
        step={1}
        type="range"
        value={first.weight}
      />
    </div>
  )
}
