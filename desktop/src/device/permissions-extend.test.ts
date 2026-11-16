import { expect, it, onTestFinished, vi } from 'vitest'

import { fakeClock, memoryFiles } from '../../tests/device-support.js'
import { createPermissionStore } from './permissions.js'

function setup() {
  const time = fakeClock()
  const { files, contents } = memoryFiles()
  const warn = vi.fn()
  const open = () => {
    const store = createPermissionStore({
      files,
      clock: time.clock,
      deviceName: 'Cals-Mac.local',
      userId: 'user-one',
      warn,
    })
    onTestFinished(() => store.dispose())
    return store
  }
  return { ...time, files, contents, warn, open }
}

it('saves a running grant at Mac now plus 15 minutes and keeps its workspace name', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First workspace')
  store.allowWorkspace('two', 'Second workspace')
  test.advance(300_000)
  expect(store.extendWorkspace('one')).toEqual({ status: 'done' })
  const windows = [
    {
      workspaceId: 'one',
      workspaceName: 'First workspace',
      expiresAt: 1_800_001_200_000,
    },
    {
      workspaceId: 'two',
      workspaceName: 'Second workspace',
      expiresAt: 1_800_000_900_000,
    },
  ]
  expect(store.settings().workspaceWindows).toEqual(windows)
  expect(test.open().settings().workspaceWindows).toEqual(windows)
})

it('fails Extend for an ended or absent grant even before its old timer fires', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', null)
  const timers = [...test.timers]
  const contents = [...test.contents]
  vi.spyOn(test.clock, 'now').mockReturnValue(1_800_000_900_000)
  for (const workspaceId of ['one', 'absent']) {
    expect(store.extendWorkspace(workspaceId)).toEqual({
      status: 'failed',
      message:
        'The 15 minutes already ended. Approve a request again to allow all commands.',
    })
    expect(store.permits('anything', workspaceId)).toBe(false)
  }
  expect(store.settings().workspaceWindows).toEqual([])
  expect([...test.timers]).toEqual(timers)
  expect([...test.contents]).toEqual(contents)
})

it('keeps the old end and timer when saving Extend fails', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First workspace')
  test.advance(300_000)
  const settings = store.settings()
  const timers = [...test.timers]
  const contents = [...test.contents]
  const write = test.files.write
  test.files.write = () => {
    expect(store.settings()).toEqual(settings)
    expect([...test.timers]).toEqual(timers)
    throw new Error('private disk failure')
  }
  expect(store.extendWorkspace('one')).toEqual({
    status: 'failed',
    message: 'The Mac could not extend the 15 minutes. Try again.',
  })
  expect(store.settings()).toEqual(settings)
  expect([...test.timers]).toEqual(timers)
  expect([...test.contents]).toEqual(contents)
  expect(test.warn).toHaveBeenCalledOnce()
  test.files.write = write
  test.advance(600_000)
  expect(store.permits('anything', 'one')).toBe(false)
  expect(test.timers.size).toBe(0)
})

it('leaves an until-Stop grant in memory when Extend is requested', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspaceUntilStop('one', 'First workspace')
  const write = vi.spyOn(test.files, 'write')
  expect(store.extendWorkspace('one')).toEqual({
    status: 'failed',
    message: 'This workspace already allows all commands until you stop.',
  })
  expect(store.settings().workspaceWindows).toEqual([
    { workspaceId: 'one', workspaceName: 'First workspace', expiresAt: null },
  ])
  expect(store.permits('anything', 'one')).toBe(true)
  expect(write).not.toHaveBeenCalled()
  expect(test.timers.size).toBe(0)
})

it('replaces the old timer and removes the saved grant at the extended end', () => {
  const test = setup()
  const store = test.open()
  const write = vi.spyOn(test.files, 'write')
  store.allowWorkspace('one', null)
  test.advance(300_000)
  store.extendWorkspace('one')
  write.mockClear()
  test.advance(600_000)
  expect(store.permits('anything', 'one')).toBe(true)
  expect(test.timers.size).toBe(1)
  expect(write).not.toHaveBeenCalled()
  test.advance(299_999)
  expect(store.permits('anything', 'one')).toBe(true)
  test.advance(1)
  expect(store.permits('anything', 'one')).toBe(false)
  expect(test.timers.size).toBe(0)
  expect(write).toHaveBeenCalledOnce()
  expect(test.open().settings().workspaceWindows).toEqual([])
})
