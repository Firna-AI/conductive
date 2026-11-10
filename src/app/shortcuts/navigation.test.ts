import { expect, test } from 'vitest'
import {
  dividerKey,
  orgForShortcut,
  stepShortcutItem,
  workspaceForShortcut,
  workspaceRowMove,
} from './navigation'
import { press } from './shortcut-test-support'

test('counts shown workspace rows and wraps navigation including the next row that needs input', () => {
  const shown = [
    { id: 'first-visible', needsInput: true },
    { id: 'last-visible', needsInput: false },
  ]
  expect(workspaceForShortcut('workspace-2', shown, 'first-visible')).toBe(
    'last-visible',
  )
  expect(
    workspaceForShortcut('workspace-3', shown, 'first-visible'),
  ).toBeUndefined()
  expect(workspaceForShortcut('next-workspace', shown, 'last-visible')).toBe(
    'first-visible',
  )
  expect(
    workspaceForShortcut('previous-workspace', shown, 'first-visible'),
  ).toBe('last-visible')
  expect(workspaceForShortcut('next-needs-input', shown, 'last-visible')).toBe(
    'first-visible',
  )
  expect(
    workspaceForShortcut(
      'next-needs-input',
      [{ id: 'only', needsInput: false }],
      'only',
    ),
  ).toBeUndefined()
  expect(orgForShortcut('org-2', ['first-org', 'last-org'])).toBe('last-org')
  expect(stepShortcutItem(['low', 'high'], 'high', 1)).toBe('low')
  expect(stepShortcutItem(['first-tab', 'last-tab'], 'first-tab', -1)).toBe(
    'last-tab',
  )
})

test('matches row moves and divider keys exactly so modified shortcut arrows remain free', () => {
  const up = press({
    key: 'ArrowUp',
    code: 'ArrowUp',
    metaKey: false,
    altKey: true,
  })
  expect(workspaceRowMove(up)).toBe('up')
  expect(workspaceRowMove({ ...up, key: 'ArrowDown', code: 'ArrowDown' })).toBe(
    'down',
  )
  expect(workspaceRowMove({ ...up, metaKey: true })).toBeNull()
  expect(workspaceRowMove({ ...up, shiftKey: true })).toBeNull()
  const left = press({ key: 'ArrowLeft', code: 'ArrowLeft', metaKey: false })
  expect(dividerKey(left)).toBe('left')
  expect(dividerKey({ ...left, shiftKey: true })).toBe('large-left')
  expect(dividerKey({ ...left, key: 'Home', code: 'Home' })).toBe('first')
  expect(dividerKey({ ...left, key: 'End', code: 'End' })).toBe('last')
  expect(dividerKey({ ...left, metaKey: true, altKey: true })).toBeNull()
  expect(dividerKey({ ...left, altKey: true, shiftKey: true })).toBeNull()
})
