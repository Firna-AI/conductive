import type { ShortcutKeyboard } from '../../shared/shortcut-key'
import { textShortcutKeys } from '../../shared/shortcut-text-keys'
import type { ShortcutHost } from './host'
import { matchesControlKey, matchesShortcut, type ShortcutPress } from './keys'

export type ShortcutFocus =
  'page' | 'text' | 'single-line-text' | 'terminal' | 'frame'

export function terminalKeepsShortcut(
  press: ShortcutPress,
  keyboard: ShortcutKeyboard,
): boolean {
  return keyboard === 'mac' ? !press.metaKey : press.ctrlKey || press.altKey
}

/** Text keys include typing, native editing, and the Linux single-line exception. */
export function isTextShortcut(
  press: ShortcutPress,
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
  focus: 'text' | 'single-line-text',
): boolean {
  if (!press.metaKey && !press.ctrlKey && !press.altKey) return true
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
