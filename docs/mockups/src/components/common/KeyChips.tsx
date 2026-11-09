import a11y from './a11y.module.css'
import styles from './KeyChips.module.css'

/**
 * A shortcut as macOS prints it: its modifiers in the order ⌃ ⌥ ⇧ ⌘, then
 * its key, such as ⌥⌘/, ⇧Enter, or ⌃⇧Tab.
 */
export type Shortcut = string

const modifiers: ReadonlySet<string> = new Set(['⌃', '⌥', '⇧', '⌘'])

/** The names that a screen reader says for the symbols of a Mac keyboard. */
const spokenNames: Readonly<Record<string, string>> = {
  '⌃': 'Control',
  '⌥': 'Option',
  '⇧': 'Shift',
  '⌘': 'Command',
  '⌫': 'Delete',
  '←': 'Left Arrow',
  '→': 'Right Arrow',
  '↑': 'Up Arrow',
  '↓': 'Down Arrow',
}

/** The symbols of a shortcut: each modifier, then the key, such as ⌥, ⌘, /. */
function symbolsOf(shortcut: Shortcut): string[] {
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
 * A shortcut as small key chips, one for each symbol, as Conductor draws
 * them: ⌘ then K. The chips use the sans font, which draws the symbols of
 * a Mac keyboard on every system. A screen reader hears the names of the
 * keys, such as Command K.
 */
export function KeyChips(props: { shortcut: Shortcut }) {
  return (
    <span className={styles.shortcut}>
      <span className={a11y.hidden}>{spokenShortcut(props.shortcut)}</span>
      <kbd aria-hidden className={styles.chips}>
        {symbolsOf(props.shortcut).map((symbol, index) => (
          <kbd className={styles.chip} key={index}>
            {symbol}
          </kbd>
        ))}
      </kbd>
    </span>
  )
}
