import { expect, test } from 'vitest'
import { shortcutKeyAvailability } from './browser-keys'
import { decideShortcut } from './decision'
import { buildShortcutKeymap, firstShortcutKey } from './keymap'
import { context, key, macApp, press, tab } from './shortcut-test-support'

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
  const keymap = buildShortcutKeymap('other', [])
  const cases = [
    ['chrome', 'linux', 'browser', 'browser'],
    ['edge', 'linux', 'browser', 'browser'],
    ['firefox', 'linux', 'available', 'browser'],
    ['unknown', 'linux', 'browser', 'browser'],
    ['firefox', 'windows', 'browser', 'available'],
    ['firefox', 'unknown', 'browser', 'browser'],
    ['chrome', 'unknown', 'browser', 'browser'],
    ['unknown', 'unknown', 'browser', 'browser'],
  ] as const
  for (const [browser, system, control, alt] of cases) {
    const host = tab(browser, system)
    for (const digit of ['1', '9', 'Numpad1', 'Numpad9']) {
      expect
        .soft(
          shortcutKeyAvailability(key(`Ctrl+${digit}`), 'other', host),
          `${browser} ${system} Ctrl+${digit}`,
        )
        .toBe(control)
      expect
        .soft(
          shortcutKeyAvailability(key(`Alt+${digit}`), 'other', host),
          `${browser} ${system} Alt+${digit}`,
        )
        .toBe(alt)
    }
    expect
      .soft(shortcutKeyAvailability(key('Ctrl+L'), 'other', host))
      .toBe('browser')
    expect
      .soft(
        firstShortcutKey('org-1', keymap, 'other', host),
        `${browser} ${system} org hint`,
      )
      .toBe(alt === 'available' ? 'Alt+1' : undefined)
    expect
      .soft(
        decideShortcut(
          context({
            keyboard: 'other',
            host,
            press: press({
              key: '1',
              code: 'Digit1',
              metaKey: false,
              ctrlKey: true,
            }),
          }),
        ),
        `${browser} ${system} workspace`,
      )
      .toEqual(
        control === 'available'
          ? { kind: 'command', command: 'workspace-1', closeMenu: false }
          : { kind: 'pass' },
      )
  }
  for (const [browser, system, address] of [
    ['chrome', 'windows', 'Alt+D'],
    ['edge', 'windows', 'F6'],
    ['chrome', 'linux', 'Alt+D'],
    ['edge', 'linux', 'F6'],
    ['firefox', 'windows', 'Alt+D'],
    ['firefox', 'linux', 'Alt+D'],
  ] as const) {
    expect
      .soft(
        shortcutKeyAvailability(key(address), 'other', tab(browser, system)),
        `${browser} ${system} ${address}`,
      )
      .toBe('browser')
  }
  for (const [host, availability] of [
    [tab('chrome'), 'browser'],
    [tab('firefox'), 'browser'],
    [tab('safari'), 'available'],
    [macApp, 'available'],
  ] as const) {
    expect
      .soft(
        shortcutKeyAvailability(key('Meta+Numpad1'), 'mac', host),
        `${host.kind} ${'browser' in host ? host.browser : 'mac'}`,
      )
      .toBe(availability)
  }
  const installed = {
    kind: 'installed-app',
    browser: 'chrome',
    system: 'linux',
  } as const
  expect(firstShortcutKey('org-1', keymap, 'other', installed)).toBe('Alt+1')
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        host: installed,
        press: press({
          key: '1',
          code: 'Digit1',
          metaKey: false,
          altKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'org-1', closeMenu: false })
  const recorded = buildShortcutKeymap('other', [
    { command: 'command-palette', keys: [key('Alt+Numpad1')] },
  ])
  for (const [host, hint, decision] of [
    [tab('chrome', 'linux'), undefined, { kind: 'pass' }],
    [
      installed,
      'Alt+Numpad1',
      { kind: 'command', command: 'command-palette', closeMenu: false },
    ],
  ] as const) {
    expect
      .soft(
        firstShortcutKey('command-palette', recorded, 'other', host),
        host.kind,
      )
      .toBe(hint)
    expect
      .soft(
        decideShortcut(
          context({
            keyboard: 'other',
            host,
            keymap: recorded,
            press: press({
              key: '1',
              code: 'Numpad1',
              metaKey: false,
              altKey: true,
            }),
          }),
        ),
        host.kind,
      )
      .toEqual(decision)
  }
})
