import { Fragment } from 'react'
import styles from './PhoneSelection.module.css'

/** The items of the selection menu that the phone shows over a selection. */
const systemItems = ['Copy', 'Select All', 'Share…'] as const

/**
 * The start handle of a selection on a phone, with the selection menu of
 * the phone above it. The phone draws both over the page, not the app, so
 * the app keeps its own button away from them, above the composer. A view
 * runs no script, so the screen draws them, and screen readers skip them.
 */
export function PhoneSelectionStart() {
  return (
    <span aria-hidden className={styles.start}>
      <span className={styles.menu}>
        {systemItems.map((item, index) => (
          <Fragment key={item}>
            {index > 0 ? <span className={styles.divider} /> : null}
            <span className={styles.item}>{item}</span>
          </Fragment>
        ))}
      </span>
    </span>
  )
}

/** The end handle of a selection on a phone. */
export function PhoneSelectionEnd() {
  return <span aria-hidden className={styles.end} />
}
