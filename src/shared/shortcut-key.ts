declare const shortcutKeyBrand: unique symbol

/** Canonical key text, checked by `readShortcutKeyText` before use. */
export type ShortcutKeyText = string & { readonly [shortcutKeyBrand]: true }

export type ShortcutKeyboard = 'mac' | 'other'
export type ShortcutSystem = 'mac' | 'windows' | 'linux' | 'unknown'

/** The exact modifiers and the unmodified name of a key. */
export interface ShortcutChord {
  readonly key: string
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly shiftKey: boolean
  readonly metaKey: boolean
}

export class ShortcutContractError extends Error {}

const modifiers = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const
const shiftedCharacters: Readonly<Record<string, string>> = {
  '~': '`',
  _: '-',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '?': '/',
}
const namedKeys = new Set([
  'Enter',
  'Escape',
  'Tab',
  'Space',
  'Backspace',
  'Delete',
  'Insert',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ContextMenu',
  'CapsLock',
  'PrintScreen',
  'ScrollLock',
  'Pause',
  'NumLock',
])

function parts(value: string): ShortcutChord | null {
  let key = value
  const held = new Set<string>()
  for (;;) {
    const modifier = modifiers.find((name) => key.startsWith(`${name}+`))
    if (modifier === undefined) break
    if (held.has(modifier)) return null
    held.add(modifier)
    key = key.slice(modifier.length + 1)
  }
  key = shortcutCharacter(key, held.has('Shift'))
  if (key === '+') held.delete('Shift')
  const character = Array.from(key).length === 1 && !/[\p{C}\p{Z}]/u.test(key)
  if (
    !character &&
    !namedKeys.has(key) &&
    !/^F([1-9]|1\d|2[0-4])$/.test(key) &&
    !/^Numpad\d$/.test(key)
  ) {
    return null
  }
  return {
    key,
    ctrlKey: held.has('Ctrl'),
    altKey: held.has('Alt'),
    shiftKey: held.has('Shift'),
    metaKey: held.has('Meta'),
  }
}

/** The character identity also accepts the shifted spelling of punctuation. */
export function shortcutCharacter(key: string, shift: boolean): string {
  if (key === ' ') return 'Space'
  if (/^[a-z]$/i.test(key)) return key.toUpperCase()
  return shift ? (shiftedCharacters[key] ?? key) : key
}

function canonical(chord: ShortcutChord): string {
  return [
    ...(chord.ctrlKey ? ['Ctrl'] : []),
    ...(chord.altKey ? ['Alt'] : []),
    ...(chord.shiftKey ? ['Shift'] : []),
    ...(chord.metaKey ? ['Meta'] : []),
    chord.key,
  ].join('+')
}

function isKeyText(value: string): value is ShortcutKeyText {
  const chord = parts(value)
  return chord !== null && canonical(chord) === value
}

/** Reads JSON key text and puts the modifiers in one stable order. */
export function readShortcutKeyText(value: unknown): ShortcutKeyText {
  const chord = typeof value === 'string' ? parts(value) : null
  if (chord !== null) {
    const text = canonical(chord)
    if (isKeyText(text)) return text
  }
  throw new ShortcutContractError('Choose a valid shortcut key.')
}

export function shortcutChord(text: ShortcutKeyText): ShortcutChord {
  const chord = parts(text)
  if (chord === null)
    throw new ShortcutContractError('Choose a valid shortcut key.')
  return chord
}

export function shortcutKeyText(chord: ShortcutChord): ShortcutKeyText {
  return readShortcutKeyText(canonical(chord))
}
