import { expect, it, vi } from 'vitest'

import { createPermissionStore } from './permissions.js'
import { fakeClock, memoryFiles } from '../../tests/device-support.js'

function setup() {
  const time = fakeClock()
  const { files, contents } = memoryFiles()
  const warn = vi.fn()
  const open = () =>
    createPermissionStore({
      files,
      clock: time.clock,
      deviceName: 'Cals-Mac.local',
      userId: 'user-one',
      warn,
    })
  return { ...time, files, contents, warn, open }
}

const savedWindows = (contents: Map<string, string>) =>
  [...contents.values()].flatMap(
    (text) =>
      (JSON.parse(text) as { workspaceWindows: unknown[] }).workspaceWindows,
  )

it('allows every command of one workspace until Stop, only in memory', () => {
  const test = setup()
  const store = test.open()
  store.allowCommand('printf saved')
  store.allowWorkspaceUntilStop('one', 'First workspace', 0)
  test.advance(24 * 60 * 60 * 1000)
  expect(store.permits('anything', 'one', 0)).toBe(true)
  expect(store.permits('anything', 'two', 0)).toBe(false)
  expect(store.settings().workspaceWindows).toEqual([
    {
      workspaceId: 'one',
      workspaceName: 'First workspace',
      macAccessPeriod: 0,
      expiresAt: null,
    },
  ])
  expect(test.timers.size).toBe(0)
  expect(savedWindows(test.contents)).toEqual([])
  const restarted = test.open()
  expect(restarted.permits('anything', 'one', 0)).toBe(false)
  expect(restarted.settings().alwaysAllowedCommands).toEqual(['printf saved'])
})

it('stops a grant until Stop without a save, so a disk error cannot fail it', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspaceUntilStop('one', null, 0)
  const write = vi.spyOn(test.files, 'write').mockImplementation(() => {
    throw new Error('disk full')
  })
  expect(store.stopWorkspace('one')).toEqual({ status: 'done' })
  expect(write).not.toHaveBeenCalled()
  expect(store.permits('anything', 'one', 0)).toBe(false)
})

it('turns running 15 minutes into a grant until Stop, and keeps a grant until Stop against the 15 minutes', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First workspace', 0)
  store.allowWorkspaceUntilStop('one', 'First workspace', 0)
  expect(store.settings().workspaceWindows).toEqual([
    {
      workspaceId: 'one',
      workspaceName: 'First workspace',
      macAccessPeriod: 0,
      expiresAt: null,
    },
  ])
  expect(test.timers.size).toBe(0)
  expect(savedWindows(test.contents)).toEqual([])
  test.advance(900_000)
  expect(store.permits('anything', 'one', 0)).toBe(true)
  store.allowWorkspace('one', 'First workspace', 0)
  expect(store.settings().workspaceWindows[0]?.expiresAt).toBeNull()
})

it('keeps the running 15 minutes until Stop, drops them from the file, and stops them', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First workspace', 0)
  test.advance(600_000)
  expect(
    store
      .prepareWorkspace({ action: 'keep-workspace', workspaceId: 'one' })
      .commit(),
  ).toEqual({ status: 'done' })
  expect(test.timers.size).toBe(0)
  expect(savedWindows(test.contents)).toEqual([])
  test.advance(600_000)
  expect(store.permits('anything', 'one', 0)).toBe(true)
  expect(
    store
      .prepareWorkspace({ action: 'keep-workspace', workspaceId: 'one' })
      .commit(),
  ).toEqual({ status: 'done' })
  expect(store.stopWorkspace('one')).toEqual({ status: 'done' })
  expect(store.permits('anything', 'one', 0)).toBe(false)
})

it('reports a Keep after the 15 minutes as failed', () => {
  const test = setup()
  const store = test.open()
  expect(
    store
      .prepareWorkspace({ action: 'keep-workspace', workspaceId: 'one' })
      .commit().status,
  ).toBe('failed')
  store.allowWorkspace('one', null, 0)
  test.advance(900_000)
  expect(
    store
      .prepareWorkspace({ action: 'keep-workspace', workspaceId: 'one' })
      .commit(),
  ).toEqual({
    status: 'failed',
    message: 'These 15 minutes already ended. The next command asks first.',
  })
  expect(store.permits('anything', 'one', 0)).toBe(false)
})

it('keeps after a failed save, and a later Stop still clears the saved 15 minutes', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', null, 0)
  const write = vi.spyOn(test.files, 'write').mockImplementationOnce(() => {
    throw new Error('disk full')
  })
  expect(
    store
      .prepareWorkspace({ action: 'keep-workspace', workspaceId: 'one' })
      .commit(),
  ).toEqual({ status: 'done' })
  expect(test.warn).toHaveBeenCalledOnce()
  expect(savedWindows(test.contents)).toHaveLength(1)
  test.advance(900_000)
  expect(store.permits('anything', 'one', 0)).toBe(true)
  expect(store.stopWorkspace('one')).toEqual({ status: 'done' })
  expect(write).toHaveBeenCalledTimes(2)
  expect(savedWindows(test.contents)).toEqual([])
})

it('ends every grant until Stop and keeps the 15 minutes', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', null, 0)
  store.allowWorkspaceUntilStop('two', null, 0)
  store.endUntilStop()
  expect(store.permits('anything', 'one', 0)).toBe(true)
  expect(store.permits('anything', 'two', 0)).toBe(false)
})

it('keeps a grant until Stop when a failed read of the file recovers', () => {
  const test = setup()
  test.open().allowCommand('printf saved')
  const read = vi.spyOn(test.files, 'read').mockImplementationOnce(() => {
    throw new Error('unavailable')
  })
  const store = test.open()
  store.allowWorkspaceUntilStop('one', null, 0)
  store.retryRead()
  expect(read).toHaveBeenCalledTimes(2)
  expect(store.permits('printf saved', 'two', 0)).toBe(true)
  expect(store.permits('anything', 'one', 0)).toBe(true)
})
