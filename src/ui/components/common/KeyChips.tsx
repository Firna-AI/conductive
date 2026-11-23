import { classes } from './classes'
import a11y from './a11y.module.css'
import styles from './KeyChips.module.css'

/**
 * A shortcut as its keyboard prints each of its keys: its modifiers, then
 * its key. A Mac gives its modifiers in the order ⌃ ⌥ ⇧ ⌘, such as
 * `['⌥', '⌘', '/']` or `['⇧', 'Enter']`. Windows gives them as words, such
 * as `['Ctrl', 'Shift', 'T']`, or `['Ctrl', '+']` for Control with Plus.
 */
export type Shortcut = readonly string[]

/** Whether two shortcuts hold the same keys, in the same order. */
export function sameShortcut(one: Shortcut, other: Shortcut): boolean {
  return (
    one.length === other.length && one.every((key, at) => key === other[at])
  )
}

/** The names that a screen reader says for the symbols and short words of a key. */
const spokenNames: Readonly<Record<string, string>> = {
  '⌃': 'Control',
  '⌥': 'Option',
  '⇧': 'Shift',
  '⌘': 'Command',
  '⌫': 'Delete',
  '⌦': 'Forward Delete',
  '←': 'Left Arrow',
  '→': 'Right Arrow',
  '↑': 'Up Arrow',
  '↓': 'Down Arrow',
  '+': 'Plus',
  Ctrl: 'Control',
  PgUp: 'Page Up',
  PgDn: 'Page Down',
}

/** The words that a screen reader says for a shortcut, such as Option Command /. */
export function spokenShortcut(shortcut: Shortcut): string {
  return shortcut.map((key) => spokenNames[key] ?? key).join(' ')
}

/**
 * A shortcut as small key chips, one for each key, as Conductor draws them:
 * ⌘ then K, or Ctrl then K. The chips use the sans font, which draws the
 * symbols of a Mac keyboard on every system. A screen reader hears the names
 * of the keys, such as Command K. `dimmed` draws a key that does not work
 * where the page runs, such as a key that a browser tab keeps: an outline
 * with dashes and no fill.
 */
export function KeyChips(props: { shortcut: Shortcut; dimmed?: boolean }) {
  return (
    <span className={styles.shortcut}>
      <span className={a11y.hidden}>{spokenShortcut(props.shortcut)}</span>
      <kbd
        aria-hidden
        className={classes(styles.chips, props.dimmed && styles.dimmed)}
      >
        {props.shortcut.map((key, index) => (
          <kbd className={styles.chip} key={index}>
            {key}
          </kbd>
        ))}
      </kbd>
    </span>
  )
}
