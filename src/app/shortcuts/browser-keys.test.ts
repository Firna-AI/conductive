import { expect, test } from 'vitest'
import { shortcutKeyAvailability } from './browser-keys'
import { decideShortcut } from './decision'
import { detectShortcutHost } from './host'
import { buildShortcutKeymap } from './keymap'
import { context, key, macApp, press, tab } from './shortcut-test-support'

test('leaves kept keys to each browser including keys that Firefox still receives', () => {
  const event = press({ key: 'T', code: 'KeyT', shiftKey: true })
  expect(
    decideShortcut(context({ press: event, host: tab('chrome') })),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(context({ press: event, host: tab('safari') })),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(context({ press: event, host: tab('unknown') })),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(context({ press: event, host: tab('firefox') })),
  ).toEqual({ kind: 'command', command: 'reopen-session', closeMenu: false })
  expect(
    decideShortcut(
      context({
        host: tab('firefox'),
        press: press({ key: '{', code: 'BracketLeft', shiftKey: true }),
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        host: tab('firefox'),
        press: press({ key: 'ArrowDown', code: 'ArrowDown', altKey: true }),
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        host: tab('chrome'),
        press: press({ key: 'ArrowDown', code: 'ArrowDown', altKey: true }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'next-workspace', closeMenu: false })
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        host: tab('chrome', 'windows'),
        press: press({
          key: 'T',
          code: 'KeyT',
          metaKey: false,
          ctrlKey: true,
          shiftKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        host: tab('firefox', 'windows'),
        press: press({
          key: 'T',
          code: 'KeyT',
          metaKey: false,
          ctrlKey: true,
          shiftKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'reopen-session', closeMenu: false })
})

test('uses every kept table for an unknown browser but releases them in app windows', () => {
  const keymap = buildShortcutKeymap('mac', [
    { command: 'go-to-checks', keys: [key('Ctrl+Home')] },
  ])
  const event = press({
    key: 'Home',
    code: 'Home',
    metaKey: false,
    ctrlKey: true,
  })
  expect(
    decideShortcut(context({ keymap, press: event, host: tab('unknown') })),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(context({ keymap, press: event, host: tab('chrome') })),
  ).toEqual({ kind: 'command', command: 'go-to-checks', closeMenu: false })
  expect(
    decideShortcut(
      context({ press: press({ key: 'n', code: 'KeyN' }), host: macApp }),
    ),
  ).toEqual({ kind: 'command', command: 'new-workspace', closeMenu: false })
  expect(
    decideShortcut(
      context({
        press: press({ key: 'n', code: 'KeyN' }),
        host: { kind: 'installed-app', browser: 'chrome', system: 'mac' },
      }),
    ),
  ).toEqual({ kind: 'command', command: 'new-workspace', closeMenu: false })
})

test('leaves browser tab and address keys but runs their second keys and other takeable keys', () => {
  for (const browser of ['chrome', 'firefox', 'safari', 'unknown'] as const) {
    expect(
      decideShortcut(
        context({
          host: tab(browser),
          press: press({ key: '&', code: 'Digit1' }),
        }),
      ),
      browser,
    ).toEqual({ kind: 'pass' })
    expect(
      decideShortcut(
        context({
          host: tab(browser),
          press: press({ key: 'l', code: 'KeyL' }),
        }),
      ),
      browser,
    ).toEqual({ kind: 'pass' })
    expect(
      decideShortcut(
        context({
          host: tab(browser),
          press: press({ key: 'Dead', code: 'Digit1', altKey: true }),
        }),
      ),
      browser,
    ).toEqual({ kind: 'command', command: 'workspace-1', closeMenu: false })
    expect(
      decideShortcut(
        context({
          host: tab(browser),
          press: press({ key: 'L', code: 'KeyL', shiftKey: true }),
        }),
      ),
      browser,
    ).toEqual({ kind: 'command', command: 'focus-message', closeMenu: false })
  }
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        host: tab('chrome', 'windows'),
        press: press({
          key: '1',
          code: 'Digit1',
          metaKey: false,
          ctrlKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        host: tab('chrome', 'windows'),
        press: press({
          key: '!',
          code: 'Digit1',
          metaKey: false,
          altKey: true,
          shiftKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'workspace-1', closeMenu: false })
  expect(
    decideShortcut(
      context({
        host: tab('chrome'),
        press: press({ key: 'A', code: 'KeyA', shiftKey: true }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'archive-workspace', closeMenu: false })
  expect(shortcutKeyAvailability(key('Meta+L'), 'mac', tab('chrome'))).toBe(
    'browser',
  )
  expect(shortcutKeyAvailability(key('Meta+L'), 'mac', tab('safari'))).toBe(
    'kept',
  )
})

test('detects installed Chromium hosts without treating Safari or Firefox web apps as installed', () => {
  const cases = [
    [
      'Macintosh Chrome/157 Safari/537',
      'standalone',
      { kind: 'installed-app', browser: 'chrome', system: 'mac' },
    ],
    [
      'Windows Chrome/157 Edg/157',
      'window-controls-overlay',
      { kind: 'installed-app', browser: 'edge', system: 'windows' },
    ],
    [
      'Linux Firefox/159',
      'standalone',
      { kind: 'browser-tab', browser: 'firefox', system: 'linux' },
    ],
    [
      'Macintosh Version/26 Safari/626',
      'standalone',
      { kind: 'browser-tab', browser: 'safari', system: 'mac' },
    ],
    [
      'Windows Chrome/157 Safari/537',
      'browser',
      { kind: 'browser-tab', browser: 'chrome', system: 'windows' },
    ],
    [
      'Unknown browser',
      'browser',
      { kind: 'browser-tab', browser: 'unknown', system: 'unknown' },
    ],
  ] as const
  for (const [agent, mode, expected] of cases) {
    expect(detectShortcutHost(agent, mode), agent).toEqual(expected)
  }
})
