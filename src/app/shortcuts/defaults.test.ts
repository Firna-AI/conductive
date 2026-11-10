import { expect, test } from 'vitest'
import { shortcutCommands } from './commands'
import { decideShortcut } from './decision'
import { defaultShortcutKeys } from './defaults'
import { buildShortcutKeymap } from './keymap'
import { context, key, press, tab } from './shortcut-test-support'

test('Restore workspace follows Archive workspace and runs an assigned key only when offered', () => {
  const archive = shortcutCommands.findIndex(
    (command) => command.id === 'archive-workspace',
  )
  expect.soft(shortcutCommands[archive + 1]).toEqual({
    id: 'restore-workspace',
    group: 'Workspace',
    scope: 'palette',
    label: 'Restore workspace',
    words: ['unarchive'],
  })
  for (const keyboard of ['mac', 'other'] as const) {
    expect(defaultShortcutKeys('restore-workspace', keyboard)).toEqual([])
    const keymap = buildShortcutKeymap(keyboard, [
      { command: 'restore-workspace', keys: [key('Ctrl+Alt+P')] },
    ])
    const restored = context({
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
    expect.soft(decideShortcut(restored), keyboard).toEqual({
      kind: 'command',
      command: 'restore-workspace',
      closeMenu: false,
    })
    expect(decideShortcut({ ...restored, offered: new Set() })).toEqual({
      kind: 'pass',
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
