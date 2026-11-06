/** The keys of the phone key row that a phone keyboard lacks, beside Ctrl. */
export type ExtraKey = 'escape' | 'tab' | 'up' | 'down'

export interface KeyModifiers {
  /** The Ctrl key of the key row is held for this key. */
  control: boolean
  /** The program asked for application cursor keys, as `vim` and `less` do. */
  applicationCursor: boolean
}

/** The bytes that a terminal sends for one key of the key row. */
export function keySequence(key: ExtraKey, modifiers: KeyModifiers): string {
  switch (key) {
    case 'escape':
      return '\x1b'
    case 'tab':
      return '\t'
    case 'up':
      return arrowSequence('A', modifiers)
    case 'down':
      return arrowSequence('B', modifiers)
  }
}

function arrowSequence(final: 'A' | 'B', modifiers: KeyModifiers): string {
  if (modifiers.control) return `\x1b[1;5${final}`
  return modifiers.applicationCursor ? `\x1bO${final}` : `\x1b[${final}`
}

/**
 * Typed input with Ctrl held: one letter or one of `@[\]^_` becomes its
 * control byte, such as 0x03 for Ctrl+C. Space gives 0x00 and `?` gives 0x7f.
 * Other input, such as a whole word from the phone keyboard, stays the same.
 */
export function withControl(input: string): string {
  if (input === ' ') return '\x00'
  if (input === '?') return '\x7f'
  const upper = input.toUpperCase()
  if (upper.length !== 1) return input
  const code = upper.charCodeAt(0)
  return code >= 64 && code <= 95 ? String.fromCharCode(code - 64) : input
}
