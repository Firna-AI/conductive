import { useId } from 'react'
import { noop } from '../../noop'
import styles from './CheckOption.module.css'

/**
 * A checkbox with its label and a muted hint, for an option of a form or
 * a question, such as an extra step of an action. `@firna/ui` has no
 * checkbox, so this draws the one of the browser in the accent colour.
 * The whole row takes the click, and on a phone it is 44 px high. A box
 * that stands for several options can show that only some of them are
 * checked.
 */
export function CheckOption(props: {
  label: string
  hint?: string
  checked: boolean
  /**
   * Only some of the options that the box stands for are checked. A view
   * runs no script, so CSS draws the mixed mark in place of the state of
   * the browser.
   */
  mixed?: boolean
}) {
  const hintId = useId()
  const mixed = props.mixed === true
  return (
    <label className={styles.option}>
      <input
        aria-checked={mixed ? 'mixed' : undefined}
        aria-describedby={props.hint ? hintId : undefined}
        checked={props.checked && !mixed}
        className={mixed ? `${styles.box} ${styles.mixed}` : styles.box}
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
