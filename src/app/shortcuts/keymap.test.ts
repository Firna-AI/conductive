import { expect, test } from 'vitest'
import { rankRows, searchWords } from '../palette/matcher'
import { shortcutCommands } from './commands'
import { decideShortcut } from './decision'
import { defaultShortcutKeys } from './defaults'
import {
  buildShortcutKeymap,
  firstShortcutKey,
  replaceShortcutKeys,
  shortcutConflicts,
} from './keymap'
import { context, key, press, tab } from './shortcut-test-support'

test('applies ordered overrides and empty removals without changing other defaults', () => {
  const keymap = buildShortcutKeymap('mac', [
    {
      command: 'command-palette',
      keys: [key('Shift+Meta+P'), key('Alt+Meta+K')],
    },
    { command: 'new-session', keys: [] },
  ])
  expect(decideShortcut(context({ keymap }))).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({
        keymap,
        press: press({ key: 'P', code: 'KeyP', shiftKey: true }),
      }),
    ),
  ).toEqual({ kind: 'command', command: 'command-palette', closeMenu: false })
  expect(
    decideShortcut(
      context({ keymap, press: press({ key: 't', code: 'KeyT' }) }),
    ),
  ).toEqual({ kind: 'pass' })
  expect(
    decideShortcut(
      context({ keymap, press: press({ key: 'j', code: 'KeyJ' }) }),
    ),
  ).toEqual({ kind: 'command', command: 'go-to-terminal', closeMenu: false })
  expect(
    firstShortcutKey('command-palette', keymap, 'mac', tab('chrome')),
  ).toBe('Shift+Meta+P')
  expect(
    firstShortcutKey('new-session', keymap, 'mac', tab('chrome')),
  ).toBeUndefined()
})

test('reports conflicts and moves a key from every owner in one replacement batch', () => {
  const keymap = buildShortcutKeymap('mac', [])
  const change = [key('Meta+K'), key('Meta+/')]
  expect(shortcutConflicts('go-to-checks', change, keymap)).toEqual([
    { command: 'command-palette', key: 'Meta+K' },
    { command: 'model-picker', key: 'Meta+/' },
  ])
  const changes = replaceShortcutKeys('go-to-checks', change, keymap)
  expect(changes).toEqual([
    { command: 'go-to-checks', keys: ['Meta+K', 'Meta+/'] },
    { command: 'command-palette', keys: [] },
    { command: 'model-picker', keys: [] },
  ])
  const replaced = buildShortcutKeymap('mac', changes)
  expect(decideShortcut(context({ keymap: replaced }))).toEqual({
    kind: 'command',
    command: 'go-to-checks',
    closeMenu: false,
  })
  expect(shortcutConflicts('go-to-checks', change, replaced)).toEqual([])
  expect(decideShortcut(context({ keymap }))).toEqual({
    kind: 'command',
    command: 'command-palette',
    closeMenu: false,
  })
})

test('finds a reset conflict and keeps an owners other keys when replacing it', () => {
  const keymap = buildShortcutKeymap('mac', [
    { command: 'command-palette', keys: [key('Meta+P')] },
    { command: 'model-picker', keys: [key('Meta+K'), key('Meta+/')] },
  ])
  const defaults = defaultShortcutKeys('command-palette', 'mac')
  expect(shortcutConflicts('command-palette', defaults, keymap)).toEqual([
    { command: 'model-picker', key: 'Meta+K' },
  ])
  expect(replaceShortcutKeys('command-palette', defaults, keymap)).toEqual([
    { command: 'command-palette', keys: ['Meta+K'] },
    { command: 'model-picker', keys: ['Meta+/'] },
  ])
  expect(firstShortcutKey('new-workspace', keymap, 'mac', tab('chrome'))).toBe(
    'Alt+Meta+N',
  )
  expect(firstShortcutKey('back', keymap, 'mac', tab('chrome'))).toBeUndefined()
})

test('finds commands through the palette words while keeping the registry in command groups', () => {
  const find = (query: string) =>
    rankRows(shortcutCommands, searchWords(query), (command) => [
      command.label,
      ...command.words,
    ]).map((command) => ({ id: command.id, group: command.group }))
  expect(find('ci')).toEqual([{ id: 'go-to-checks', group: 'Workspace' }])
  expect(find('new task')).toEqual([
    { id: 'new-workspace', group: 'Workspace' },
  ])
  expect(find('agent chat')).toEqual([{ id: 'new-session', group: 'Chat' }])
})
