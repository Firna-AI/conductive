import { classes } from './classes'
import styles from './PhoneKeyboard.module.css'

/** A key of the keyboard: a letter, or a wide key with a word. */
type Key = { label: string; wide?: 'action' | 'space' }

const letters = (row: string): Key[] => Array.from(row, (label) => ({ label }))

/** The rows of the keyboard, as a phone shows them for a text field. */
const rows: readonly (readonly Key[])[] = [
  letters('qwertyuiop'),
  letters('asdfghjkl'),
  [
    { label: '⇧', wide: 'action' },
    ...letters('zxcvbnm'),
    { label: '⌫', wide: 'action' },
  ],
  [
    { label: '123', wide: 'action' },
    { label: 'space', wide: 'space' },
    { label: 'return', wide: 'action' },
  ],
]

/**
 * The on-screen keyboard of a phone, which the system draws over the bottom
 * of the screen while a text field has the focus. The page keeps its size
 * under it, so the keyboard covers the bottom of the page, such as the
 * message box and the tabs at the bottom. It is not part of the app, so
 * screen readers skip it.
 */
export function PhoneKeyboard() {
  return (
    <div aria-hidden className={styles.keyboard}>
      {rows.map((row, index) => (
        <div className={styles.row} key={index}>
          {row.map((key) => (
            <span
              className={classes(
                styles.key,
                key.wide === 'action' && styles.action,
                key.wide === 'space' && styles.space,
              )}
              key={key.label}
            >
              {key.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
