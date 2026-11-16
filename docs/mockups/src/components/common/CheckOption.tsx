import { useId } from 'react'
import { noop } from '../../noop'
import styles from './CheckOption.module.css'

/**
 * A checkbox with its label and a muted hint, for an option of a form or
 * a question, such as an extra step of an action. `@firna/ui` has no
 * checkbox, so this draws the one of the browser in the accent colour.
 * The whole row takes the click, and on a phone it is 40 px high.
 */
export function CheckOption(props: {
  label: string
  hint?: string
  checked: boolean
}) {
  const hintId = useId()
  return (
    <label className={styles.option}>
      <input
        aria-describedby={props.hint ? hintId : undefined}
        checked={props.checked}
        className={styles.box}
        onChange={noop}
        type="checkbox"
      />
      <span className={styles.text}>
        <span className={styles.label}>{props.label}</span>
        {props.hint ? (
          <span className={styles.hint} id={hintId}>
            {props.hint}
          </span>
        ) : null}
      </span>
    </label>
  )
}
