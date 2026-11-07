import { expect, it, vi } from 'vitest'

import { createPermissionStore } from './permissions.js'
import { fakeClock, memoryFiles } from '../../tests/device-support.js'

function setup() {
  const time = fakeClock()
  const { files, contents } = memoryFiles()
  const warn = vi.fn()
  const open = (userId = 'user-one') =>
    createPermissionStore({
      files,
      clock: time.clock,
      deviceName: 'Cals-Mac.local',
      userId,
      warn,
    })
  return { ...time, files, contents, warn, open }
}

it('persists only exact allowed commands for the same account on this Mac', () => {
  const test = setup()
  const store = test.open()
  store.allowCommand(' printf Hello\n')
  expect(store.permits(' printf Hello\n', 'one')).toBe(true)
  expect(store.permits('printf Hello', 'one')).toBe(false)
  expect(store.permits(' printf hello\n', 'one')).toBe(false)
  expect(store.permits(' printf Hello\n && rm file', 'one')).toBe(false)
  store.dispose()
  const restored = test.open()
  expect(restored.settings()).toEqual({
    deviceName: 'Cals-Mac.local',
    alwaysAllowedCommands: [' printf Hello\n'],
    workspaceWindows: [],
  })
  expect(test.open('user-two').permits(' printf Hello\n', 'one')).toBe(false)
  restored.removeCommand(' printf Hello\n')
  expect(test.open().permits(' printf Hello\n', 'one')).toBe(false)
})

it('keeps separate workspace deadlines and never renews a live grant', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First workspace')
  test.advance(300_000)
  store.allowWorkspace('two', 'Second workspace')
  store.allowWorkspace('one', 'First workspace')
  expect(store.settings().workspaceWindows).toEqual([
    {
      workspaceId: 'one',
      workspaceName: 'First workspace',
      expiresAt: 1_800_000_900_000,
    },
    {
      workspaceId: 'two',
      workspaceName: 'Second workspace',
      expiresAt: 1_800_001_200_000,
    },
  ])
  test.advance(599_999)
  expect(store.permits('anything', 'one')).toBe(true)
  test.advance(1)
  expect(store.permits('anything', 'one')).toBe(false)
  expect(store.permits('anything', 'two')).toBe(true)
  store.stopWorkspace('two')
  expect(store.permits('anything', 'two')).toBe(false)
  expect(test.timers.size).toBe(0)
  expect(test.open().settings().workspaceWindows).toEqual([])
})

it('keeps the original deadline across a restart and expires without a settings read', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First workspace')
  test.advance(400_000)
  store.dispose()
  const restored = test.open()
  expect(restored.permits('anything', 'one')).toBe(true)
  test.advance(500_000)
  expect(restored.settings().workspaceWindows).toEqual([])
  expect(test.open().permits('anything', 'one')).toBe(false)
})

it('does not grant a permission when its private atomic write fails', () => {
  const test = setup()
  const store = test.open()
  test.files.write = () => {
    throw new Error('disk full with private data')
  }
  expect(() => store.allowCommand('secret command')).toThrow()
  expect(store.permits('secret command', 'one')).toBe(false)
  expect(() => store.allowWorkspace('one', 'First workspace')).toThrow()
  expect(store.permits('anything', 'one')).toBe(false)
  expect(test.timers.size).toBe(0)
})

it('refuses an always-allowed list above 900,000 UTF-8 bytes and keeps it removable', () => {
  const test = setup()
  const store = test.open()
  const command = 'é'.repeat(449_998)
  store.allowCommand(command)
  expect(() => store.allowCommand('printf extra')).toThrowError(
    'Always allow is full. Remove a saved command in This Mac, or request this command again and choose Allow.',
  )
  expect(store.settings().alwaysAllowedCommands).toEqual([command])
  expect(store.permits('printf extra', 'one')).toBe(false)
  store.dispose()
  const restored = test.open()
  expect(restored.settings().alwaysAllowedCommands).toEqual([command])
  expect(restored.removeCommand(command)).toEqual({ status: 'done' })
  restored.allowCommand('printf extra')
  expect(test.open().settings().alwaysAllowedCommands).toEqual(['printf extra'])
})

it('discards malformed local settings without logging their contents', () => {
  const test = setup()
  const store = test.open()
  store.allowCommand('private command')
  for (const name of test.contents.keys())
    test.contents.set(name, '{private invalid json')
  expect(test.open().settings()).toEqual({
    deviceName: 'Cals-Mac.local',
    alwaysAllowedCommands: [],
    workspaceWindows: [],
  })
  expect(test.warn).toHaveBeenCalledWith()
})
