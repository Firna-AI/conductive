import type { ReactNode } from 'react'
import styles from './CheckField.module.css'

/**
 * A checkbox with its text, drawn in its state. The text can hold links,
 * so it names the box, and only the box sits in the label, which is at
 * least 44 px on a phone.
 */
export function CheckField(props: {
  id: string
  checked: boolean
  children: ReactNode
}) {
  const textId = `${props.id}-text`
  return (
    <div className={styles.field}>
      <label className={styles.hit}>
        <input
          aria-labelledby={textId}
          checked={props.checked}
          className={styles.box}
          id={props.id}
          readOnly
          type="checkbox"
        />
      </label>
      <span className={styles.text} id={textId}>
        {props.children}
      </span>
    </div>
  )
}
