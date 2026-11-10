import { expect, test } from 'vitest'
import { decideShortcut } from './decision'
import type { ShortcutHost } from './host'
import { context, macApp, press, tab } from './shortcut-test-support'

test('runs an offered default through each host on the matching keyboard', () => {
  const macHosts: ShortcutHost[] = [
    macApp,
    { kind: 'installed-app', browser: 'chrome', system: 'mac' },
    tab('chrome'),
    tab('edge'),
    tab('firefox'),
    tab('safari'),
    tab('unknown'),
  ]
  for (const host of macHosts) {
    expect(
      decideShortcut(
        context({
          host,
          press: press({ key: 'Dead', code: 'KeyN', altKey: true }),
        }),
      ),
      JSON.stringify(host),
    ).toEqual({ kind: 'command', command: 'new-workspace', closeMenu: false })
  }
  const otherHosts: ShortcutHost[] = [
    { kind: 'installed-app', browser: 'chrome', system: 'windows' },
    { kind: 'installed-app', browser: 'chrome', system: 'linux' },
    tab('chrome', 'windows'),
    tab('edge', 'windows'),
    tab('firefox', 'windows'),
    tab('unknown', 'windows'),
    tab('chrome', 'linux'),
    tab('firefox', 'linux'),
    tab('unknown', 'linux'),
  ]
  for (const host of otherHosts) {
    expect(
      decideShortcut(
        context({
          keyboard: 'other',
          host,
          press: press({
            key: 'N',
            code: 'KeyN',
            metaKey: false,
            altKey: true,
            shiftKey: true,
          }),
        }),
      ),
      JSON.stringify(host),
    ).toEqual({ kind: 'command', command: 'new-workspace', closeMenu: false })
  }
})

test('the palette key is ⌘K on a Mac and Ctrl+K on Windows and Linux, without another modifier', () => {
  const offered = new Set(['command-palette'] as const)
  const windows = tab('chrome', 'windows')
  const outcome = (
    event: ReturnType<typeof press>,
    keyboard: 'mac' | 'other' = 'mac',
  ) => {
    const decision = decideShortcut(
      context({
        press: event,
        keyboard,
        host: keyboard === 'mac' ? macApp : windows,
        offered,
      }),
    )
    return decision.kind === 'command' ? decision.command : 'pass'
  }
  const control = { metaKey: false, ctrlKey: true }
  expect({
    macCommand: outcome(press()),
    macCapsLock: outcome(press({ key: 'K' })),
    macControl: outcome(press(control)),
    macBoth: outcome(press({ ctrlKey: true })),
    macShift: outcome(press({ key: 'K', shiftKey: true })),
    macOtherKey: outcome(press({ key: 'j', code: 'KeyJ' })),
    otherControl: outcome(press(control), 'other'),
    otherMeta: outcome(press(), 'other'),
    otherAlt: outcome(press({ ...control, altKey: true }), 'other'),
  }).toEqual({
    macCommand: 'command-palette',
    macCapsLock: 'command-palette',
    macControl: 'pass',
    macBoth: 'pass',
    macShift: 'pass',
    macOtherKey: 'pass',
    otherControl: 'command-palette',
    otherMeta: 'pass',
    otherAlt: 'pass',
  })
})

test('runs only offered commands and keeps Mac window commands in the Mac app', () => {
  expect(decideShortcut(context({ offered: new Set() }))).toEqual({
    kind: 'pass',
  })
  const back = press({ key: '[', code: 'BracketLeft' })
  expect(decideShortcut(context({ press: back }))).toEqual({
    kind: 'command',
    command: 'back',
    closeMenu: false,
  })
  expect(decideShortcut(context({ press: back, host: tab('chrome') }))).toEqual(
    { kind: 'pass' },
  )
  expect(
    decideShortcut(
      context({
        press: back,
        host: { kind: 'installed-app', browser: 'chrome', system: 'mac' },
      }),
    ),
  ).toEqual({ kind: 'pass' })
})

test('runs the first press once and leaves repeats, composition, recording, and frames alone', () => {
  expect(decideShortcut(context())).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: false,
  })
  expect(decideShortcut(context({ press: press({ repeat: true }) }))).toEqual({
    kind: 'pass',
  })
  expect(
    decideShortcut(context({ press: press({ isComposing: true }) })),
  ).toEqual({ kind: 'pass' })
  expect(decideShortcut(context({ recording: true }))).toEqual({ kind: 'pass' })
  expect(decideShortcut(context({ focus: 'frame' }))).toEqual({ kind: 'pass' })
})

test('allows only the owner command through an open modal layer', () => {
  expect(decideShortcut(context({ modal: 'model-picker' }))).toEqual({
    kind: 'pass',
  })
  expect(decideShortcut(context({ modal: 'command-palette' }))).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: false,
  })
})

test('closes a willing menu before a command and leaves a blocked menu its key', () => {
  expect(decideShortcut(context({ menu: 'closable' }))).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: true,
  })
  expect(decideShortcut(context({ menu: 'blocked' }))).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({ menu: 'closable', press: press({ key: 'x', code: 'KeyX' }) }),
    ),
  ).toEqual({ kind: 'pass' })
})
