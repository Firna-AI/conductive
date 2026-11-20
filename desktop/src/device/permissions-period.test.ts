import { expect, it, vi } from 'vitest'

import { fakeClock, memoryFiles } from '../../tests/device-support.js'
import { createPermissionStore } from './permissions.js'

function setup() {
  const time = fakeClock()
  const { files, contents } = memoryFiles()
  const open = () =>
    createPermissionStore({
      files,
      clock: time.clock,
      userId: 'member',
      deviceName: 'Mac',
      warn: vi.fn(),
    })
  return { ...time, files, contents, open }
}

it('covers only requests of the grant period and ends a grant on a newer request', () => {
  const test = setup()
  const store = test.open()
  store.allowWorkspace('one', 'First', 4)
  expect(store.permits('pwd', 'one', 4)).toBe(true)
  expect(store.permits('pwd', 'one')).toBe(false)
  expect(store.permits('pwd', 'one', 3)).toBe(false)
  expect(store.permits('pwd', 'one', 5)).toBe(false)
  expect(store.settings().workspaceWindows).toEqual([])
  expect(test.timers.size).toBe(0)
  expect(test.open().settings().workspaceWindows).toEqual([])
  store.allowWorkspaceUntilStop('one', 'First', 5)
  expect(store.permits('pwd', 'one', 5)).toBe(true)
  expect(store.permits('pwd', 'one', 6)).toBe(false)
  expect(store.settings().workspaceWindows).toEqual([])
  store.allowCommand('pwd')
  expect(store.permits('pwd', 'one')).toBe(true)
})

it('round trips the timed period and drops legacy saved grants while keeping commands', () => {
  const test = setup()
  const store = test.open()
  store.allowCommand('pwd')
  store.allowWorkspace('one', null, 7)
  expect(test.open().settings().workspaceWindows).toEqual([
    {
      workspaceId: 'one',
      workspaceName: null,
      expiresAt: 1_800_000_900_000,
      macAccessPeriod: 7,
    },
  ])
  for (const [name, contents] of test.contents) {
    const legacy: unknown = JSON.parse(contents)
    if (
      !legacy ||
      typeof legacy !== 'object' ||
      !('workspaceWindows' in legacy)
    )
      throw new Error('Missing saved grants')
    legacy.workspaceWindows = [
      { workspaceId: 'one', workspaceName: null, expiresAt: 1_800_000_900_000 },
    ]
    test.contents.set(name, JSON.stringify(legacy))
  }
  expect(test.open().settings()).toEqual({
    deviceName: 'Mac',
    alwaysAllowedCommands: ['pwd'],
    workspaceWindows: [],
  })
})

it('does not use a grant from an older Worker to allow another request', () => {
  const store = setup().open()
  store.allowWorkspaceUntilStop('one', null)
  expect(store.permits('pwd', 'one')).toBe(false)
  expect(store.permits('pwd', 'one', 0)).toBe(false)
})

it('ends old periods before Keep and Extend and cannot bring them back', () => {
  for (const action of ['keep-workspace', 'extend-workspace'] as const) {
    const test = setup()
    const store = test.open()
    store.allowWorkspace('one', null, 0)
    expect(
      store
        .prepareWorkspace({ action, workspaceId: 'one', macAccessPeriod: 1 })
        .commit().status,
    ).toBe('failed')
    expect(store.settings().workspaceWindows).toEqual([])
    expect(test.open().settings().workspaceWindows).toEqual([])
    expect(test.timers.size).toBe(0)
    expect(store.permits('pwd', 'one', 0)).toBe(false)
  }
})
