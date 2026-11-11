import { expect, test } from 'vitest'
import { decideShortcut } from './decision'
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
  for (const keyboard of ['mac', 'other'] as const) {
    const first = press({
      key: 'P',
      code: 'KeyP',
      metaKey: keyboard === 'mac',
      ctrlKey: keyboard === 'other',
      shiftKey: true,
    })
    const offered = context({
      keyboard,
      host: tab('firefox', keyboard === 'mac' ? 'mac' : 'linux'),
    })
    expect
      .soft(decideShortcut({ ...offered, press: first }), `${keyboard} first`)
      .toEqual({ kind: 'pass' })
    expect
      .soft(
        decideShortcut({
          ...offered,
          press: { ...first, key: 'Dead', ctrlKey: false, altKey: true },
        }),
        `${keyboard} second`,
      )
      .toEqual({
        kind: 'command',
        command: 'create-pull-request',
        closeMenu: false,
      })
  }
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
