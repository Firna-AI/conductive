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
  ]
  for (const change of invalid) {
    expect(
      () =>
        readSaveShortcutsRequest({
          keyboard: 'other',
          changes: [{ command: 'command-palette', keys: ['Ctrl+P'] }, change],
        }),
      JSON.stringify(change),
    ).toThrow(ShortcutContractError)
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

test('refuses fixed menu and text keys across hosts and both other systems', () => {
  for (const [keyboard, text] of [
    ['mac', 'Meta+R'],
    ['mac', 'Alt+Shift+Meta+V'],
    ['mac', 'Ctrl+K'],
    ['other', 'Alt+Backspace'],
    ['other', 'Ctrl+Shift+U'],
    ['other', 'Alt+ArrowUp'],
    ['other', 'Shift+F10'],
  ]) {
    expect(
      () =>
        readSaveShortcutsRequest({
          keyboard,
          changes: [{ command: 'model-picker', keys: [text] }],
        }),
      `${keyboard} ${text}`,
    ).toThrow('Choose a key that is not fixed.')
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

test('skips retired stored commands while preserving confirmed empty overrides', () => {
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
  for (const value of [
    null,
    {},
    '',
    'Ctrl',
    'Ctrl+Ctrl+K',
    'Meta+Escape+K',
    'Meta+\n',
  ]) {
    expect(() => readShortcutKeyText(value), JSON.stringify(value)).toThrow(
      'Choose a valid shortcut key.',
    )
  }
})
