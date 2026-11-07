import { expect, it } from 'vitest'

import {
  sessionFixture,
  successfulResult,
} from '../../tests/device-session-support.js'

it('refuses an oversized Always allow save and lets a fresh request use Allow once', async () => {
  const test = sessionFixture()
  const saved = 'é'.repeat(449_998)
  test.permissions.allowCommand(saved)
  test.session.receive({ type: 'command.request', request: test.command() })
  test.session.receive({
    type: 'command.approval',
    workspaceId: 'workspace-one',
    requestId: 'request-one',
    operationId: 'always-full',
    action: 'always-allow',
  })
  expect(test.sent).toEqual([
    {
      type: 'command.failed',
      workspaceId: 'workspace-one',
      requestId: 'request-one',
      message:
        'Always allow is full. Remove a saved command in This Mac, or request this command again and choose Allow.',
    },
  ])
  expect(test.run).not.toHaveBeenCalled()
  expect(test.permissions.settings().alwaysAllowedCommands).toEqual([saved])
  const fresh = test.command({ requestId: 'request-two' })
  test.session.receive({ type: 'command.request', request: fresh })
  test.session.receive({
    type: 'command.approval',
    workspaceId: fresh.workspaceId,
    requestId: fresh.requestId,
    operationId: 'allow-once',
    action: 'allow',
  })
  expect(test.run).toHaveBeenCalledExactlyOnceWith(fresh)
  test.pending[0].finish(successfulResult)
  await Promise.resolve()
  expect(test.sent.at(-1)).toEqual({
    type: 'command.result',
    workspaceId: 'workspace-one',
    requestId: 'request-two',
    result: {
      stdout: 'done',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      truncated: false,
    },
  })
  test.session.receive({
    type: 'command.request',
    request: test.command({ requestId: 'request-three' }),
  })
  expect(test.run).toHaveBeenCalledTimes(1)
  expect(test.notify).toHaveBeenCalledTimes(3)
  expect(test.permissions.settings().alwaysAllowedCommands).toEqual([saved])
  expect(test.warn).not.toHaveBeenCalled()
})
