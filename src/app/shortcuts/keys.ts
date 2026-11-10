import {
  readShortcutKeyText,
  shortcutChord,
  shortcutCharacter,
  shortcutKeyText,
  type ShortcutChord,
  type ShortcutKeyboard,
  type ShortcutKeyText,
} from '../../shared/shortcut-key'
import type { KeyPress } from '../services'

export type ShortcutPress = Pick<
  KeyPress,
  | 'key'
  | 'code'
  | 'metaKey'
  | 'ctrlKey'
  | 'altKey'
  | 'shiftKey'
  | 'repeat'
  | 'isComposing'
>

const physicalCharacters: Readonly<Record<string, string>> = {
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
}

function physicalKey(code: string): string | undefined {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit\d$/.test(code)) return code.slice(5)
  return physicalCharacters[code]
}

function character(press: ShortcutPress): string {
  return shortcutCharacter(press.key, press.shiftKey)
}

function otherScript(press: ShortcutPress): boolean {
  return (
    /^[\p{L}\p{N}]$/u.test(press.key) &&
    !/^[\p{Script=Latin}0-9]$/u.test(press.key)
  )
}

/** Alt and top-row digits use physical keys. Other keys use their characters. */
export function matchesShortcut(
  key: ShortcutKeyText,
  press: ShortcutPress,
): boolean {
  const chord = shortcutChord(key)
  const zoomPlus = chord.key === '+' && press.key === '+'
  if (
    chord.metaKey !== press.metaKey ||
    chord.ctrlKey !== press.ctrlKey ||
    chord.altKey !== press.altKey ||
    (!zoomPlus && chord.shiftKey !== press.shiftKey)
  )
    return false
  if (/^\d$/.test(chord.key)) return press.code === `Digit${chord.key}`
  if (chord.key.startsWith('Numpad')) return chord.key === press.code
  const physical = physicalKey(press.code)
  if (chord.altKey && physical !== undefined) return chord.key === physical
  if (/^[A-Z]$/.test(chord.key) && otherScript(press))
    return chord.key === physical
  return chord.key === character(press)
}

/** The recorder stores the same key identity that the listener matches. */
export function shortcutFromPress(
  press: ShortcutPress,
): ShortcutKeyText | null {
  const physical = physicalKey(press.code)
  const byCode =
    press.altKey || /^Digit\d$/.test(press.code) || otherScript(press)
  const key = press.code.startsWith('Numpad')
    ? press.code
    : byCode && physical !== undefined
      ? physical
      : character(press)
  try {
    return shortcutKeyText({
      ...press,
      key,
      shiftKey: key === '+' ? false : press.shiftKey,
    })
  } catch {
    return null
  }
}

const names: Readonly<Record<string, string>> = {
  Escape: 'Esc',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backspace: '⌫',
  Delete: '⌦',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ContextMenu: 'Menu',
}

/** Visible key text, with Mac symbols or the names on the other keyboard. */
export function formatShortcut(
  key: ShortcutKeyText,
  keyboard: ShortcutKeyboard,
): string {
  const chord = shortcutChord(key)
  const name =
    keyboard === 'other' && ['Backspace', 'Delete'].includes(chord.key)
      ? chord.key
      : (names[chord.key] ?? chord.key)
  if (keyboard === 'mac')
    return `${chord.ctrlKey ? '⌃' : ''}${chord.altKey ? '⌥' : ''}${chord.shiftKey ? '⇧' : ''}${chord.metaKey ? '⌘' : ''}${name}`
  return [
    chord.ctrlKey ? 'Ctrl' : '',
    chord.altKey ? 'Alt' : '',
    chord.shiftKey ? 'Shift' : '',
    chord.metaKey ? 'Meta' : '',
    name,
  ]
    .filter(Boolean)
    .join('+')
}

/** Exact fixed control keys, shared by workspace rows and panel dividers. */
export function matchesControlKey(text: string, press: ShortcutPress): boolean {
  return matchesShortcut(readShortcutKeyText(text), press)
}

/** A key description for accessible hints, using the ARIA modifier names. */
export function ariaShortcut(key: ShortcutKeyText): string {
  const chord: ShortcutChord = shortcutChord(key)
  return [
    chord.ctrlKey ? 'Control' : '',
    chord.altKey ? 'Alt' : '',
    chord.shiftKey ? 'Shift' : '',
    chord.metaKey ? 'Meta' : '',
    chord.key === '+' ? 'Plus' : chord.key,
  ]
    .filter(Boolean)
    .join('+')
}
