import { describe, expect, test } from 'vitest'
import {
  isPaletteKey,
  paletteKeyOutcome,
  type KeyChord,
  type KeyContext,
} from './palette-keys'

describe('the palette key', () => {
  test('is ⌘K on a Mac and Ctrl+K on Windows and Linux, without another modifier', () => {
    const chord = (overrides: Partial<KeyChord>): KeyChord => ({
      key: 'k',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...overrides,
    })
    expect({
      macCommand: isPaletteKey(chord({ metaKey: true }), 'mac'),
      macCapsLock: isPaletteKey(chord({ key: 'K', metaKey: true }), 'mac'),
      macControl: isPaletteKey(chord({ ctrlKey: true }), 'mac'),
      macBoth: isPaletteKey(chord({ metaKey: true, ctrlKey: true }), 'mac'),
      macShift: isPaletteKey(chord({ metaKey: true, shiftKey: true }), 'mac'),
      macOtherKey: isPaletteKey(chord({ key: 'j', metaKey: true }), 'mac'),
      otherControl: isPaletteKey(chord({ ctrlKey: true }), 'other'),
      otherMeta: isPaletteKey(chord({ metaKey: true }), 'other'),
      otherAlt: isPaletteKey(chord({ ctrlKey: true, altKey: true }), 'other'),
    }).toEqual({
      macCommand: true,
      macCapsLock: true,
      macControl: false,
      macBoth: false,
      macShift: false,
      macOtherKey: false,
      otherControl: true,
      otherMeta: false,
      otherAlt: false,
    })
  })

  test('closes an open palette, opens a closed one, and leaves the key to a dialog, and to the terminal on Windows and Linux', () => {
    const outcome = (overrides: Partial<KeyContext>) =>
      paletteKeyOutcome({
        platform: 'other',
        open: false,
        modal: false,
        inTerminal: false,
        ...overrides,
      })
    expect({
      closed: outcome({}),
      open: outcome({ open: true }),
      dialog: outcome({ modal: true }),
      terminal: outcome({ inTerminal: true }),
      macTerminal: outcome({ inTerminal: true, platform: 'mac' }),
    }).toEqual({
      closed: 'open',
      open: 'close',
      dialog: 'pass',
      terminal: 'pass',
      macTerminal: 'open',
    })
  })
})
