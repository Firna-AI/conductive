import { expect, test } from 'vitest'
import { shortcutCommands } from './commands'
import { decideShortcut } from './decision'
import { defaultShortcutKeys } from './defaults'
import { buildShortcutKeymap } from './keymap'
import { context, key, macApp, press, tab } from './shortcut-test-support'

test('Restore workspace and Send feedback follow their groups, start with the keys of Conductor, and run their keys only when offered', () => {
  const cases = [
    {
      id: 'restore-workspace',
      previous: 'archive-workspace',
      group: 'Workspace',
      label: 'Restore workspace',
      words: ['unarchive'],
      defaults: { mac: [], other: [] },
    },
    {
      id: 'send-feedback',
      previous: 'create-org',
      group: 'General',
      label: 'Send feedback',
      words: ['bug', 'idea', 'support', 'contact', 'help', 'report'],
      defaults: { mac: ['Alt+Meta+F'], other: ['Alt+Shift+F'] },
    },
  ] as const
  for (const item of cases) {
    const previous = shortcutCommands.findIndex(
      (command) => command.id === item.previous,
    )
    expect.soft(shortcutCommands[previous + 1], item.id).toEqual({
      id: item.id,
      group: item.group,
      scope: 'palette',
      label: item.label,
      words: item.words,
    })
    for (const keyboard of ['mac', 'other'] as const) {
      expect
        .soft(defaultShortcutKeys(item.id, keyboard), `${item.id} ${keyboard}`)
        .toEqual(item.defaults[keyboard])
      const keymap = buildShortcutKeymap(keyboard, [
        { command: item.id, keys: [key('Ctrl+Alt+P')] },
      ])
      const offered = context({
        keyboard,
        keymap,
        press: press({
          key: 'p',
          code: 'KeyP',
          metaKey: false,
          ctrlKey: true,
          altKey: true,
        }),
      })
      expect.soft(decideShortcut(offered), `${item.id} ${keyboard}`).toEqual({
        kind: 'command',
        command: item.id,
        closeMenu: false,
      })
      expect(decideShortcut({ ...offered, offered: new Set() })).toEqual({
        kind: 'pass',
      })
    }
  }
  // The key of Conductor runs Send feedback also from the message field of a tab.
  const feedback = [
    {
      keyboard: 'mac',
      host: tab('firefox'),
      press: press({ key: 'ƒ', code: 'KeyF', altKey: true }),
    },
    {
      keyboard: 'other',
      host: tab('firefox', 'linux'),
      press: press({
        key: 'F',
        code: 'KeyF',
        metaKey: false,
        altKey: true,
        shiftKey: true,
      }),
    },
  ] as const
  for (const item of feedback) {
    expect
      .soft(decideShortcut(context({ ...item, focus: 'text' })), item.keyboard)
      .toEqual({ kind: 'command', command: 'send-feedback', closeMenu: false })
  }
})

test('a plain ] toggles the right column and a plain [ the sidebar of the Mac app outside a text field, and each goes on to the message field', () => {
  const right = press({ key: ']', code: 'BracketRight', metaKey: false })
  const left = press({ key: '[', code: 'BracketLeft', metaKey: false })
  const cases = [
    {
      keyboard: 'mac',
      host: tab('chrome'),
      press: right,
      command: 'toggle-right-column',
    },
    {
      keyboard: 'other',
      host: tab('chrome', 'windows'),
      press: right,
      command: 'toggle-right-column',
    },
    { keyboard: 'mac', host: macApp, press: left, command: 'toggle-sidebar' },
  ] as const
  for (const { command, ...item } of cases) {
    // A pass leaves the press to the message field, which types its character.
    expect
      .soft(
        {
          page: decideShortcut(context(item)),
          message: decideShortcut(context({ ...item, focus: 'text' })),
        },
        `${item.press.key} on ${item.keyboard}`,
      )
      .toEqual({
        page: { kind: 'command', command, closeMenu: false },
        message: { kind: 'pass' },
      })
  }
})

test('runs the checked manual defaults without the old clashes or text editing keys', () => {
  const mac = [
    {
      event: press({ key: '/', code: 'Slash', ctrlKey: true }),
      command: 'next-effort',
    },
    {
      event: press({ key: 'Backspace', code: 'Backspace', ctrlKey: true }),
      command: 'stop-agent',
    },
    {
      event: press({ key: 'ArrowUp', code: 'ArrowUp', ctrlKey: true }),
      command: 'previous-workspace',
    },
  ]
  for (const { event, command } of mac) {
    expect(
      decideShortcut(
        context({ focus: 'text', press: event, host: tab('firefox') }),
      ),
      command,
    ).toEqual({ kind: 'command', command, closeMenu: false })
  }
  const other = [
    { key: 'Z', code: 'KeyZ', command: 'reopen-session' },
    { key: 'T', code: 'KeyT', command: 'new-session' },
    { key: 'M', code: 'KeyM', command: 'model-picker' },
    { key: 'S', code: 'KeyS', command: 'stop-agent' },
    { key: 'L', code: 'KeyL', command: 'next-needs-input' },
    { key: 'PageUp', code: 'PageUp', command: 'previous-workspace' },
    { key: 'PageDown', code: 'PageDown', command: 'next-workspace' },
  ]
  for (const { key, code, command } of other) {
    expect(
      decideShortcut(
        context({
          keyboard: 'other',
          focus: 'text',
          host: tab('chrome', 'windows'),
          press: press({
            key,
            code,
            metaKey: false,
            altKey: true,
            shiftKey: true,
          }),
        }),
      ),
      command,
    ).toEqual({ kind: 'command', command, closeMenu: false })
  }
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        focus: 'text',
        host: tab('chrome', 'windows'),
        press: press({
          key: 'L',
          code: 'KeyL',
          metaKey: false,
          ctrlKey: true,
          shiftKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'focus-message', closeMenu: false })
  expect(
    decideShortcut(
      context({
        keyboard: 'other',
        focus: 'text',
        host: tab('chrome', 'windows'),
        press: press({
          key: '?',
          code: 'Slash',
          metaKey: false,
          ctrlKey: true,
          shiftKey: true,
        }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'next-effort', closeMenu: false })
})
