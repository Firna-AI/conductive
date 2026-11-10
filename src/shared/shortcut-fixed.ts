import {
  readShortcutKeyText,
  type ShortcutKeyboard,
  type ShortcutKeyText,
} from './shortcut-key'
import { textShortcutKeys } from './shortcut-text-keys'

const common = [
  'Enter',
  'Shift+Enter',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'Shift+ArrowLeft',
  'Shift+ArrowRight',
  'Alt+ArrowUp',
  'Alt+ArrowDown',
  'Shift+F10',
  'ContextMenu',
].map(readShortcutKeyText)

const macMenus = [
  'Meta+Q',
  'Meta+H',
  'Alt+Meta+H',
  'Meta+M',
  'Meta+R',
  'Shift+Meta+R',
  'Meta+0',
  'Meta++',
  'Meta+-',
  'Ctrl+Meta+F',
  'Alt+Meta+I',
].map(readShortcutKeyText)

const fixed: Readonly<Record<ShortcutKeyboard, readonly ShortcutKeyText[]>> = {
  mac: [
    ...new Set([...common, ...textShortcutKeys('mac', 'mac'), ...macMenus]),
  ],
  other: [...new Set([...common, ...textShortcutKeys('other', 'unknown')])],
}

/** The recorder and the Worker use this same host-independent list. */
export function fixedShortcutKeys(
  keyboard: ShortcutKeyboard,
): readonly ShortcutKeyText[] {
  return fixed[keyboard]
}

export function isFixedShortcut(
  key: ShortcutKeyText,
  keyboard: ShortcutKeyboard,
): boolean {
  return fixed[keyboard].includes(key)
}
