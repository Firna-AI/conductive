import { expect, it, vi } from 'vitest'

import { deviceLifecycleFixture } from '../../tests/device-lifecycle-support.js'

it('isolates cached account permissions and keeps their timers until the application owner disposes every store', async () => {
  const test = deviceLifecycleFixture()
  for (const [userId, text, workspaceId] of [
    ['user-one', 'printf one', 'workspace-one'],
    ['user-two', 'printf two', 'workspace-two'],
  ]) {
    const saved = test.openPermissions(userId)
    saved.allowCommand(text)
    saved.allowWorkspace(workspaceId, workspaceId)
    saved.dispose()
  }
  await test.start()
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'one-exact',
      workspaceId: 'no-window',
      command: 'printf one',
    }),
  })
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'one-workspace',
      command: 'printf workspace',
    }),
  })
  expect(test.processes.map((process) => process.command)).toEqual([
    'printf one',
    'printf workspace',
  ])
  await test.signIn('user-two')
  expect(
    test.processes.map((process) => process.kill.mock.calls.length),
  ).toEqual([1, 1])
  for (const [requestId, workspaceId] of [
    ['one-command', 'no-window'],
    ['one-window', 'workspace-one'],
  ])
    test.receive({
      type: 'command.request',
      request: test.command({ requestId, workspaceId, command: 'printf one' }),
    })
  expect(test.processes).toHaveLength(2)
  expect(test.notify).toHaveBeenCalledTimes(2)
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'two-exact',
      workspaceId: 'no-window',
      command: 'printf two',
    }),
  })
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'two-workspace',
      workspaceId: 'workspace-two',
      command: 'printf other',
    }),
  })
  expect(test.processes.slice(2).map((process) => process.command)).toEqual([
    'printf two',
    'printf other',
  ])
  await test.signIn('user-one')
  expect(
    test.processes.map((process) => process.kill.mock.calls.length),
  ).toEqual([1, 1, 1, 1])
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'two-command',
      workspaceId: 'workspace-two',
      command: 'printf two',
    }),
  })
  expect(test.processes).toHaveLength(4)
  expect(test.notify).toHaveBeenCalledTimes(3)
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'one-again',
      workspaceId: 'no-window',
      command: 'printf one',
    }),
  })
  expect(test.processes).toHaveLength(5)
  test.connection.sleep()
  expect(
    test.processes.map((process) => process.kill.mock.calls.length),
  ).toEqual([1, 1, 1, 1, 1])
  expect(test.timers.size).toBe(2)
  const write = vi.spyOn(test.files, 'write')
  test.stop()
  expect(test.timers.size).toBe(0)
  test.advance(900_000)
  expect(write).not.toHaveBeenCalled()
  expect(test.warn).not.toHaveBeenCalled()
  expect(test.invalid).not.toHaveBeenCalled()
})
