import { expect, test } from 'vitest'
import { decideShortcut } from './decision'
import { buildShortcutKeymap } from './keymap'
import type { ShortcutPress } from './keys'
import { context, key, press, tab } from './shortcut-test-support'
import {
  isTextShortcut,
  terminalKeepsShortcut,
  type ShortcutFocus,
} from './text-keys'

test('keeps Mac keys without Command in the terminal but runs Command keys there', () => {
  expect(decideShortcut(context({ focus: 'terminal' }))).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: false,
  })
  // A recorded key without ⌘ runs on the page, and the terminal keeps it.
  const keymap = buildShortcutKeymap('mac', [
    { command: 'go-to-checks', keys: [key('P')] },
  ])
  const typed = press({ key: 'p', code: 'KeyP', metaKey: false })
  expect({
    page: decideShortcut(context({ press: typed, keymap, focus: 'page' })),
    terminal: decideShortcut(
      context({ press: typed, keymap, focus: 'terminal' }),
    ),
  }).toEqual({
    page: { kind: 'command', command: 'go-to-checks', closeMenu: false },
    terminal: { kind: 'pass' },
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

test('keeps every key in Windows and Linux terminals, also a recorded key without Control or Alt', () => {
  const keymap = buildShortcutKeymap('other', [
    { command: 'go-to-checks', keys: [key('P'), key('Shift+P'), key('F2')] },
  ])
  const recorded = [
    press({ key: 'p', code: 'KeyP', metaKey: false }),
    press({ key: 'P', code: 'KeyP', metaKey: false, shiftKey: true }),
    press({ key: 'F2', code: 'F2', metaKey: false }),
  ]
  for (const system of ['windows', 'linux'] as const) {
    const decide = (event: ShortcutPress, focus: ShortcutFocus) =>
      decideShortcut(
        context({
          host: tab('chrome', system),
          keyboard: 'other',
          keymap,
          focus,
          press: event,
        }),
      )
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
      ...recorded,
    ]) {
      expect(decide(event, 'terminal'), `${system} ${event.key}`).toEqual({
        kind: 'pass',
      })
    }
    // The same recorded keys run their command outside the terminal.
    for (const event of recorded) {
      expect(
        decide(event, 'page'),
        `${system} ${event.key} on the page`,
      ).toEqual({ kind: 'command', command: 'go-to-checks', closeMenu: false })
    }
  }
})

test('protects native edit, movement, and Enter keys in text fields on each system', () => {
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
  for (const code of ['Enter', 'NumpadEnter']) {
    for (const focus of ['text', 'single-line-text'] as const) {
      expect(
        isTextShortcut(
          press({
            key: 'Enter',
            code,
            ctrlKey: true,
            altKey: true,
            shiftKey: true,
          }),
          'mac',
          tab('chrome'),
          focus,
        ),
        `${code} in ${focus}`,
      ).toBe(true)
    }
  }
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
    for (const focus of ['text', 'single-line-text'] as const) {
      expect(
        decideShortcut(context({ press: event, keymap, focus })),
        `${text} in ${focus}`,
      ).toEqual({ kind: 'pass' })
    }
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
