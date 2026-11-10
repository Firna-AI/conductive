import { expect, test } from 'vitest'
import { isShortcutCommandId } from './shortcut-commands'
import {
  readShortcutKeyText,
  shortcutChord,
  ShortcutContractError,
} from './shortcut-key'
import {
  readSaveShortcutsRequest,
  readSaveShortcutsResponse,
  readShortcutPreferences,
} from './shortcut-read'

test('parses ordered edits, removals, and resets without merging the keyboards', () => {
  expect(
    readSaveShortcutsRequest({
      keyboard: 'mac',
      changes: [
        { command: 'command-palette', keys: ['Meta+Shift+p', 'Alt+Meta+K'] },
        { command: 'new-session', keys: [] },
        { command: 'model-picker', keys: null },
      ],
    }),
  ).toEqual({
    keyboard: 'mac',
    changes: [
      { command: 'command-palette', keys: ['Shift+Meta+P', 'Alt+Meta+K'] },
      { command: 'new-session', keys: [] },
      { command: 'model-picker', keys: null },
    ],
  })
  expect(
    readShortcutPreferences({
      mac: [{ command: 'command-palette', keys: [] }],
      other: [{ command: 'command-palette', keys: ['Ctrl+P'] }],
    }),
  ).toEqual({
    mac: [{ command: 'command-palette', keys: [] }],
    other: [{ command: 'command-palette', keys: ['Ctrl+P'] }],
  })
})

test('rejects an invalid member of a save before returning a partial batch', () => {
  const invalid = [
    { command: 'go-to-desktop', keys: [] },
    { command: 'new-session', keys: ['Ctrl+Control'] },
    { command: 'new-session', keys: [null] },
    { command: 'new-session', keys: ['NumpadEnter'] },
    { command: 'new-session', keys: ['Meta+NumpadDivide'] },
  ]
  for (const change of invalid) {
    expect
      .soft(
        () =>
          readSaveShortcutsRequest({
            keyboard: 'other',
            changes: [{ command: 'command-palette', keys: ['Ctrl+P'] }, change],
          }),
        JSON.stringify(change),
      )
      .toThrow(ShortcutContractError)
  }
  expect(() =>
    readSaveShortcutsRequest({ keyboard: 'linux', changes: [] }),
  ).toThrow('Choose a shortcut keyboard.')
})

test('accepts four keys but refuses a fifth key for one command', () => {
  const request = {
    keyboard: 'mac',
    changes: [
      {
        command: 'model-picker',
        keys: ['Meta+P', 'Alt+Meta+P', 'Ctrl+Meta+P', 'Alt+Ctrl+Meta+P'],
      },
    ],
  }
  expect(readSaveShortcutsRequest(request).changes[0]?.keys).toEqual([
    'Meta+P',
    'Alt+Meta+P',
    'Ctrl+Meta+P',
    'Ctrl+Alt+Meta+P',
  ])
  expect(() =>
    readSaveShortcutsRequest({
      ...request,
      changes: [
        {
          command: 'model-picker',
          keys: [...request.changes[0].keys, 'Alt+Ctrl+Shift+Meta+P'],
        },
      ],
    }),
  ).toThrow('Choose at most four keys for a command.')
})

test('refuses fixed control, menu, and text keys across hosts and both other systems', () => {
  for (const [keyboard, text] of [
    ['mac', 'Meta+Enter'],
    ['mac', 'Ctrl+Shift+Enter'],
    ['mac', 'Ctrl+Alt+Shift+Meta+Enter'],
    ['mac', 'Space'],
    ['other', 'Meta+Enter'],
    ['other', 'Ctrl+Shift+Enter'],
    ['other', 'Ctrl+Alt+Shift+Meta+Enter'],
    ['other', 'Space'],
    ['mac', 'Meta+R'],
    ['mac', 'Alt+Shift+Meta+V'],
    ['mac', 'Ctrl+K'],
    ['other', 'Alt+Backspace'],
    ['other', 'Ctrl+Shift+U'],
    ['other', 'Alt+ArrowUp'],
    ['other', 'Shift+F10'],
  ]) {
    expect
      .soft(
        () =>
          readSaveShortcutsRequest({
            keyboard,
            changes: [{ command: 'model-picker', keys: [text] }],
          }),
        `${keyboard} ${text}`,
      )
      .toThrow('Choose a key that is not fixed.')
  }
  expect(
    readSaveShortcutsRequest({
      keyboard: 'other',
      changes: [{ command: 'attach-files', keys: ['Ctrl+U'] }],
    }).changes,
  ).toEqual([{ command: 'attach-files', keys: ['Ctrl+U'] }])
  expect(
    readSaveShortcutsRequest({
      keyboard: 'other',
      changes: [{ command: 'model-picker', keys: ['Alt+Shift+ArrowUp'] }],
    }).changes,
  ).toEqual([{ command: 'model-picker', keys: ['Alt+Shift+ArrowUp'] }])
})

test('skips retired commands and unreadable stored keys while preserving confirmed empty overrides', () => {
  expect(
    readSaveShortcutsResponse({
      keyboard: 'mac',
      changes: [
        { command: 'retired-command', keys: ['not a current key'] },
        { command: 'new-session', keys: [] },
      ],
    }),
  ).toEqual({
    keyboard: 'mac',
    changes: [{ command: 'new-session', keys: [] }],
  })
  const stored = [
    {
      command: 'command-palette',
      keys: ['Meta+P', 'Meta+R', 'not a current key', 'Ctrl+Alt+Meta+P'],
    },
    { command: 'model-picker', keys: ['Meta+R', 'not a current key'] },
    {
      command: 'go-to-checks',
      keys: ['Meta+Enter', 'Ctrl+Shift+Enter', 'NumpadEnter', 'Space'],
    },
    { command: 'stop-agent', keys: ['Meta+NumpadDivide'] },
    { command: 'new-session', keys: [] },
  ]
  const expected = [
    { command: 'command-palette', keys: ['Meta+P', 'Ctrl+Alt+Meta+P'] },
    { command: 'new-session', keys: [] },
  ]
  const reply = { keyboard: 'mac', changes: stored }
  expect(() => readSaveShortcutsResponse(reply)).not.toThrow()
  expect(readSaveShortcutsResponse(reply)).toEqual({
    keyboard: 'mac',
    changes: expected,
  })
  const preferences = { mac: stored, other: [] }
  expect(() => readShortcutPreferences(preferences)).not.toThrow()
  expect(readShortcutPreferences(preferences)).toEqual({
    mac: expected,
    other: [],
  })
  expect(isShortcutCommandId('go-to-desktop')).toBe(false)
  expect(isShortcutCommandId('workspace-9')).toBe(true)
  expect(
    readShortcutPreferences({
      mac: Array.from({ length: 64 }, () => ({
        command: 'retired-command',
        keys: [],
      })),
      other: [],
    }),
  ).toEqual({ mac: [], other: [] })
  expect(() => readShortcutPreferences({ mac: [], other: null })).toThrow(
    'Send a valid list of shortcut changes.',
  )
})

test('narrows key text without accepting modifier-only or malformed keys', () => {
  expect(shortcutChord(readShortcutKeyText('Meta+Ctrl+k'))).toEqual({
    key: 'K',
    metaKey: true,
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
  })
  expect(readShortcutKeyText('Meta++')).toBe('Meta++')
  expect(readShortcutKeyText('Shift+Meta+{')).toBe('Shift+Meta+[')
  expect(readShortcutKeyText('Shift+Meta++')).toBe('Meta++')
  expect(readShortcutKeyText('Alt+Numpad8')).toBe('Alt+Numpad8')
  for (const value of [
    null,
    {},
    '',
    'Ctrl',
    'Ctrl+Ctrl+K',
    'Meta+Escape+K',
    'Meta+\n',
    'Meta+NumpadDivide',
    'NumpadEnter',
    'NumpadAdd',
    'NumpadSubtract',
    'NumpadMultiply',
    'NumpadDecimal',
    'NumpadEqual',
  ]) {
    expect
      .soft(() => readShortcutKeyText(value), JSON.stringify(value))
      .toThrow('Choose a valid shortcut key.')
  }
})
