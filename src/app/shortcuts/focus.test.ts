import { expect, test } from 'vitest'
import { decideShortcut } from './decision'
import { buildShortcutKeymap } from './keymap'
import { context, key, press, tab } from './shortcut-test-support'
import { isTextShortcut, terminalKeepsShortcut } from './text-keys'

test('keeps Mac control keys in the terminal but runs Command keys there', () => {
  expect(decideShortcut(context({ focus: 'terminal' }))).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: false,
  })
  expect(
    decideShortcut(
      context({
        focus: 'terminal',
        press: press({
          key: 'Tab',
          code: 'Tab',
          metaKey: false,
          ctrlKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        focus: 'terminal',
        press: press({
          key: '4',
          code: 'Digit4',
          metaKey: false,
          ctrlKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        focus: 'terminal',
        press: press({ key: 'Backspace', code: 'Backspace', ctrlKey: true }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'stop-agent', closeMenu: false })
  expect(
    terminalKeepsShortcut(press({ metaKey: false, altKey: true }), 'mac'),
  ).toBe(true)
})

test('keeps both Control and Alt defaults in Windows and Linux terminals', () => {
  for (const system of ['windows', 'linux'] as const) {
    for (const event of [
      press({ metaKey: false, ctrlKey: true }),
      press({
        key: 'N',
        code: 'KeyN',
        metaKey: false,
        altKey: true,
        shiftKey: true,
      }),
      press({ key: '1', code: 'Digit1', metaKey: false, altKey: true }),
    ]) {
      expect(
        decideShortcut(
          context({
            host: tab('chrome', system),
            keyboard: 'other',
            focus: 'terminal',
            press: event,
          }),
        ),
        `${system} ${event.key}`,
      ).toEqual({ kind: 'pass' })
    }
  }
})

test('protects native edit and movement keys in text fields on each system', () => {
  const cases = [
    {
      keyboard: 'mac',
      host: tab('chrome'),
      text: 'Meta+C',
      event: press({ key: 'c', code: 'KeyC' }),
    },
    {
      keyboard: 'mac',
      host: tab('safari'),
      text: 'Ctrl+K',
      event: press({ metaKey: false, ctrlKey: true }),
    },
    {
      keyboard: 'mac',
      host: tab('firefox'),
      text: 'Alt+Meta+Ctrl+ArrowLeft',
      event: press({
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        ctrlKey: true,
        altKey: true,
      }),
    },
    {
      keyboard: 'other',
      host: tab('chrome', 'windows'),
      text: 'Alt+Backspace',
      event: press({
        key: 'Backspace',
        code: 'Backspace',
        metaKey: false,
        altKey: true,
      }),
    },
    {
      keyboard: 'other',
      host: tab('firefox', 'linux'),
      text: 'Ctrl+Shift+Backspace',
      event: press({
        key: 'Backspace',
        code: 'Backspace',
        metaKey: false,
        ctrlKey: true,
        shiftKey: true,
      }),
    },
    {
      keyboard: 'other',
      host: tab('firefox', 'linux'),
      text: 'Ctrl+/',
      event: press({ key: '/', code: 'Slash', metaKey: false, ctrlKey: true }),
    },
  ] as const
  for (const item of cases) {
    // A supplied map must never bypass the text-field protection.
    const keymap = buildShortcutKeymap(item.keyboard, [
      { command: 'go-to-checks', keys: [key(item.text)] },
    ])
    expect(
      decideShortcut(
        context({ ...item, press: item.event, keymap, focus: 'text' }),
      ),
      item.text,
    ).toEqual({ kind: 'pass' })
  }
  expect(decideShortcut(context({ focus: 'text' }))).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: false,
  })
  expect(
    decideShortcut(
      context({
        focus: 'text',
        press: press({ key: 'ArrowDown', code: 'ArrowDown', ctrlKey: true }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'next-workspace', closeMenu: false })
  expect(
    isTextShortcut(
      press({ key: 'ArrowLeft', code: 'ArrowLeft', altKey: true }),
      'mac',
      tab('chrome'),
      'text',
    ),
  ).toBe(false)
})

test('runs unmodified keys and Mac Option typing only outside text fields', () => {
  for (const [text, event] of [
    ['K', press({ metaKey: false })],
    ['Shift+K', press({ key: 'K', metaKey: false, shiftKey: true })],
    [
      'Alt+1',
      press({ key: '¡', code: 'Digit1', metaKey: false, altKey: true }),
    ],
  ] as const) {
    const keymap = buildShortcutKeymap('mac', [
      { command: 'go-to-checks', keys: [key(text)] },
    ])
    expect(
      decideShortcut(context({ press: event, keymap, focus: 'page' })),
      text,
    ).toEqual({ kind: 'command', command: 'go-to-checks', closeMenu: false })
    expect(
      decideShortcut(context({ press: event, keymap, focus: 'text' })),
      text,
    ).toEqual({ kind: 'pass' })
  }
})

test('leaves Control U only to a Linux single-line field and keeps attachment elsewhere', () => {
  const event = press({ key: 'u', code: 'KeyU', metaKey: false, ctrlKey: true })
  expect(
    decideShortcut(
      context({
        press: event,
        keyboard: 'other',
        host: tab('firefox', 'linux'),
        focus: 'single-line-text',
      }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        press: event,
        keyboard: 'other',
        host: tab('firefox', 'linux'),
        focus: 'text',
      }),
    ),
  ).toEqual({ kind: 'command', command: 'attach-files', closeMenu: false })
  expect(
    decideShortcut(
      context({
        press: event,
        keyboard: 'other',
        host: tab('chrome', 'windows'),
        focus: 'single-line-text',
      }),
    ),
  ).toEqual({ kind: 'command', command: 'attach-files', closeMenu: false })
})
