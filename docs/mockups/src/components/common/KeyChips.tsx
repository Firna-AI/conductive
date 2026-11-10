import { classes } from './classes'
import a11y from './a11y.module.css'
import styles from './KeyChips.module.css'

/**
 * A shortcut as its keyboard prints it. On a Mac: its modifiers in the
 * order ⌃ ⌥ ⇧ ⌘, then its key, such as ⌥⌘/, ⇧Enter, or ⌃⇧Tab. On Windows:
 * its modifiers as words and its key, joined with +, such as Ctrl+Shift+T.
 */
export type Shortcut = string

const modifiers: ReadonlySet<string> = new Set(['⌃', '⌥', '⇧', '⌘'])

/** The modifiers that start a shortcut of a Windows keyboard. */
const windowsShortcut = /^(Ctrl|Alt|Shift|Meta)\+./

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
  Ctrl: 'Control',
  PgUp: 'Page Up',
  PgDn: 'Page Down',
}

/**
 * The keys of a shortcut, each modifier and then the key: ⌥, ⌘, / on a Mac,
 * and Ctrl, Shift, T on Windows.
 */
function symbolsOf(shortcut: Shortcut): string[] {
  if (windowsShortcut.test(shortcut)) return shortcut.split('+')
  const symbols = [...shortcut]
  const key = symbols.findIndex((symbol) => !modifiers.has(symbol))
  if (key === -1) return symbols
  return [...symbols.slice(0, key), symbols.slice(key).join('')]
}

/** The words that a screen reader says for a shortcut, such as Option Command /. */
export function spokenShortcut(shortcut: Shortcut): string {
  return symbolsOf(shortcut)
    .map((symbol) => spokenNames[symbol] ?? symbol)
    .join(' ')
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
        {symbolsOf(props.shortcut).map((symbol, index) => (
          <kbd className={styles.chip} key={index}>
            {symbol}
          </kbd>
        ))}
      </kbd>
    </span>
  )
}
