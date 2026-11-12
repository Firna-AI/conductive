import { expect, test } from 'vitest'
import { decideShortcut } from './decision'
import { buildShortcutKeymap } from './keymap'
import { context, key, press, tab } from './shortcut-test-support'

test('restores the switch modifier in either order and runs each held command once', () => {
  for (const [altKey, shiftKey, layoutModifiers] of [
    [true, false, ['shiftKey']],
    [false, true, ['altKey']],
  ] as const) {
    const restored = context({
      keyboard: 'other',
      host: tab('chrome', 'linux'),
      press: press({
        key: '№',
        code: 'Digit1',
        metaKey: false,
        altKey,
        shiftKey,
        layoutModifiers,
      }),
    })
    expect
      .soft(decideShortcut(restored), layoutModifiers.join())
      .toEqual({ kind: 'command', command: 'workspace-1', closeMenu: false })
    expect
      .soft(
        decideShortcut({
          ...restored,
          press: { ...restored.press, repeat: true },
        }),
      )
      .toEqual({ kind: 'repeat', command: 'workspace-1' })
  }
  expect
    .soft(
      decideShortcut(
        context({
          keyboard: 'other',
          host: tab('chrome', 'linux'),
          press: press({
            key: '.',
            code: 'Slash',
            metaKey: false,
            altKey: true,
            layoutModifiers: ['shiftKey'],
          }),
        }),
      ),
    )
    .toEqual({
      kind: 'command',
      command: 'keyboard-shortcuts',
      closeMenu: false,
    })
})

test('stops an unmatched restored key on the page and in a text field, including text keys', () => {
  const events = [
    press({
      key: 'ArrowLeft',
      code: 'ArrowLeft',
      metaKey: false,
      altKey: true,
      layoutModifiers: ['shiftKey'],
    }),
    press({
      key: 'z',
      code: 'KeyZ',
      metaKey: false,
      ctrlKey: true,
      layoutModifiers: ['shiftKey'],
    }),
  ]
  for (const focus of ['page', 'text', 'single-line-text'] as const) {
    for (const event of events) {
      const restored = context({
        keyboard: 'other',
        host: tab('chrome', 'linux'),
        focus,
        offered: new Set(),
        press: event,
      })
      expect
        .soft(decideShortcut(restored), `${focus} ${event.key}`)
        .toEqual({ kind: 'stop', closeMenu: false })
      expect
        .soft(decideShortcut({ ...restored, menu: 'closable' }))
        .toEqual({ kind: 'stop', closeMenu: true })
    }
    for (const event of [
      press({ key: 'a', code: 'KeyQ', metaKey: false, layoutModifiers: [] }),
      press({
        key: 'a',
        code: 'KeyQ',
        metaKey: false,
        layoutModifiers: ['shiftKey'],
      }),
      press({
        key: 'A',
        code: 'KeyQ',
        metaKey: false,
        shiftKey: true,
        layoutModifiers: [],
      }),
    ]) {
      expect
        .soft(
          decideShortcut(
            context({
              keyboard: 'other',
              host: tab('chrome', 'linux'),
              focus,
              offered: new Set(),
              press: event,
            }),
          ),
          `${focus} plain ${event.key}`,
        )
        .toEqual({ kind: 'pass' })
    }
  }
})

test('passes switch keys and protected input while still stopping the same unmatched restored press elsewhere', () => {
  const restored = context({
    keyboard: 'other',
    host: tab('chrome', 'linux'),
    offered: new Set(),
    press: press({
      metaKey: false,
      altKey: true,
      layoutModifiers: ['shiftKey'],
    }),
  })
  expect
    .soft(decideShortcut(restored))
    .toEqual({ kind: 'stop', closeMenu: false })
  for (const exception of [
    { recording: true },
    { focus: 'frame' },
    { focus: 'terminal' },
    { menu: 'blocked' },
    { press: { ...restored.press, isComposing: true } },
    ...['GroupNext', 'GroupPrevious', 'GroupFirst', 'GroupLast'].map((key) => ({
      press: { ...restored.press, key, code: 'ShiftLeft' },
    })),
  ] as const) {
    expect(
      decideShortcut({ ...restored, ...exception }),
      JSON.stringify(exception),
    ).toEqual({ kind: 'pass' })
  }
  expect(
    decideShortcut({
      ...restored,
      host: tab('chrome', 'windows'),
      focus: 'terminal',
    }),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut({ ...restored, keyboard: 'mac', focus: 'terminal' }),
  ).toEqual({ kind: 'pass' })
  const keymap = buildShortcutKeymap('mac', [
    { command: 'go-to-checks', keys: [key('Shift+Meta+K')] },
  ])
  expect
    .soft(
      decideShortcut(
        context({
          keymap,
          focus: 'terminal',
          press: press({
            shiftKey: true,
            metaKey: false,
            layoutModifiers: ['metaKey'],
          }),
        }),
      ),
    )
    .toEqual({ kind: 'command', command: 'go-to-checks', closeMenu: false })
})
