import { expect, test } from 'vitest'
import { fixedShortcutKeys } from '../../shared/shortcut-fixed'
import {
  ariaShortcut,
  formatShortcut,
  matchesShortcut,
  shortcutFromPress,
} from './keys'
import { key, press } from './shortcut-test-support'

test('matches Latin letters by character when the layout moves their physical key', () => {
  expect(matchesShortcut(key('Meta+K'), press({ code: 'KeyQ' }))).toBe(true)
  expect(matchesShortcut(key('Meta+Q'), press({ code: 'KeyQ' }))).toBe(false)
  expect(matchesShortcut(key('Meta+K'), press({ key: 'K' }))).toBe(true)
  expect(
    matchesShortcut(key('Meta+/'), press({ key: '/', code: 'Minus' })),
  ).toBe(true)
  expect(
    matchesShortcut(
      key('Shift+Meta+['),
      press({ key: '{', code: 'BracketLeft', shiftKey: true }),
    ),
  ).toBe(true)
})

test('matches Option keys and top-row digits physically without taking numpad digits', () => {
  expect(
    matchesShortcut(
      key('Alt+Meta+N'),
      press({ key: 'Dead', code: 'KeyN', altKey: true }),
    ),
  ).toBe(true)
  expect(
    matchesShortcut(
      key('Alt+Meta+N'),
      press({ key: 'n', code: 'KeyM', altKey: true }),
    ),
  ).toBe(false)
  expect(
    matchesShortcut(key('Meta+1'), press({ key: '&', code: 'Digit1' })),
  ).toBe(true)
  expect
    .soft(matchesShortcut(key('Meta+&'), press({ key: '&', code: 'Digit1' })))
    .toBe(false)
  expect(
    matchesShortcut(key('Meta+1'), press({ key: '1', code: 'Numpad1' })),
  ).toBe(false)
  expect(
    matchesShortcut(
      key('Alt+Shift+1'),
      press({
        key: '!',
        code: 'Digit1',
        metaKey: false,
        altKey: true,
        shiftKey: true,
      }),
    ),
  ).toBe(true)
  expect(
    matchesShortcut(
      key('Alt+1'),
      press({ key: '1', code: 'Numpad1', metaKey: false, altKey: true }),
    ),
  ).toBe(false)
  expect(
    matchesShortcut(
      key('Numpad8'),
      press({ key: '8', code: 'Numpad8', metaKey: false }),
    ),
  ).toBe(true)
  expect(
    matchesShortcut(
      key('Numpad8'),
      press({ key: 'ArrowUp', code: 'Numpad8', metaKey: false }),
    ),
  ).toBe(false)
})

test('uses the physical letter when a Cyrillic or Greek layout changes its script', () => {
  expect(
    matchesShortcut(key('Meta+K'), press({ key: 'é', code: 'KeyK' })),
  ).toBe(false)
  expect(
    matchesShortcut(
      key('Ctrl+K'),
      press({ key: 'л', code: 'KeyK', metaKey: false, ctrlKey: true }),
    ),
  ).toBe(true)
  expect(
    matchesShortcut(key('Meta+K'), press({ key: 'κ', code: 'KeyK' })),
  ).toBe(true)
  expect(
    matchesShortcut(key('Meta+Q'), press({ key: 'κ', code: 'KeyK' })),
  ).toBe(false)
  expect(
    matchesShortcut(key('Meta+κ'), press({ key: 'κ', code: 'KeyK' })),
  ).toBe(false)
})

test('requires exact modifiers so a more specific key cannot run another command', () => {
  expect(matchesShortcut(key('Meta+K'), press({ ctrlKey: true }))).toBe(false)
  expect(matchesShortcut(key('Meta+K'), press({ altKey: true }))).toBe(false)
  expect(matchesShortcut(key('Meta+K'), press({ shiftKey: true }))).toBe(false)
  expect(matchesShortcut(key('Ctrl+K'), press())).toBe(false)
})

test('records the matching identity and formats each keyboard and accessible hint', () => {
  const option = shortcutFromPress(
    press({ key: 'Dead', code: 'KeyN', altKey: true }),
  )
  expect(option).toBe('Alt+Meta+N')
  expect(shortcutFromPress(press({ key: '&', code: 'Digit1' }))).toBe('Meta+1')
  expect(
    shortcutFromPress(
      press({ key: 'л', code: 'KeyK', metaKey: false, ctrlKey: true }),
    ),
  ).toBe('Ctrl+K')
  expect(
    shortcutFromPress(
      press({ key: '1', code: 'Numpad1', metaKey: false, altKey: true }),
    ),
  ).toBe('Alt+Numpad1')
  expect
    .soft(shortcutFromPress(press({ key: '/', code: 'NumpadDivide' })))
    .toBe('Meta+/')
  expect
    .soft(
      shortcutFromPress(
        press({ key: 'ArrowUp', code: 'Numpad8', metaKey: false }),
      ),
    )
    .toBe('ArrowUp')
  expect
    .soft(shortcutFromPress(press({ key: 'Enter', code: 'NumpadEnter' })))
    .toBe('Meta+Enter')
  expect(
    shortcutFromPress(
      press({
        key: 'Control',
        code: 'ControlLeft',
        metaKey: false,
        ctrlKey: true,
      }),
    ),
  ).toBeNull()
  expect(formatShortcut(key('Ctrl+Alt+Shift+Meta+N'), 'mac')).toBe('⌃⌥⇧⌘N')
  expect(formatShortcut(key('Ctrl+Shift+Tab'), 'other')).toBe('Ctrl+Shift+Tab')
  expect(ariaShortcut(key('Ctrl+Shift+Tab'))).toBe('Control+Shift+Tab')
  expect(ariaShortcut(key('Meta++'))).toBe('Meta+Plus')
  expect(formatShortcut(key('Ctrl+Backspace'), 'other')).toBe('Ctrl+Backspace')
  expect(
    fixedShortcutKeys('mac').some((key) =>
      matchesShortcut(key, press({ key: '+', code: 'Equal', shiftKey: true })),
    ),
  ).toBe(true)
})
