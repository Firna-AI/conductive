import type { ShortcutKeyboard } from '../../shared/shortcut-key'
import { textShortcutKeys } from '../../shared/shortcut-text-keys'
import type { ShortcutHost } from './host'
import { matchesControlKey, matchesShortcut, type ShortcutPress } from './keys'

export type ShortcutFocus =
  'page' | 'text' | 'single-line-text' | 'terminal' | 'frame'

/**
 * A program in the terminal can read each key. On Windows and Linux, the
 * terminal keeps every key, also a recorded key such as P, Shift+P, or F2.
 * On a Mac, only a key with ⌘ goes to the app from the terminal.
 */
export function terminalKeepsShortcut(
  press: ShortcutPress,
  keyboard: ShortcutKeyboard,
): boolean {
  if (keyboard !== 'mac') return true
  return !press.metaKey
}

/**
 * Text keys include typing, each Enter, native editing, and the Linux
 * single-line exception. A text field takes Enter with any modifiers, also
 * the Enter of the keypad: the message field sends on ⌘Enter, Ctrl+Enter,
 * and Alt+Enter, and adds a line with Shift, and a rename saves on each Enter.
 */
export function isTextShortcut(
  press: ShortcutPress,
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
  focus: 'text' | 'single-line-text',
): boolean {
  if (!press.metaKey && !press.ctrlKey && !press.altKey) return true
  if (press.key === 'Enter') return true
  if (keyboard === 'mac' && press.altKey && !press.metaKey && !press.ctrlKey)
    return true
  if (
    focus === 'single-line-text' &&
    host.system === 'linux' &&
    matchesControlKey('Ctrl+U', press)
  )
    return true
  return textShortcutKeys(keyboard, host.system).some((key) =>
    matchesShortcut(key, press),
  )
}
