import { expect, it } from 'vitest'

import { deviceLifecycleFixture } from '../../tests/device-lifecycle-support.js'

/** Sends a request, and allows it until Stop when `answer` is true. */
function request(
  test: ReturnType<typeof deviceLifecycleFixture>,
  requestId: string,
  answer = false,
) {
  const sent = test.command({ requestId, workspaceId: 'workspace-one' })
  test.receive({ type: 'command.request', request: sent })
  if (answer)
    test.receive({
      type: 'command.approval',
      workspaceId: sent.workspaceId,
      requestId,
      operationId: `answer-${requestId}`,
      action: 'allow-workspace-until-stop',
    })
}

it('keeps a grant until Stop across a reconnect, and a sign-out or another account ends it', async () => {
  const test = deviceLifecycleFixture()
  await test.start()
  request(test, 'first', true)
  expect(test.processes).toHaveLength(1)

  test.connection.sleep()
  await test.connection.wake()
  test.pair()
  request(test, 'after-wake')
  expect(test.processes).toHaveLength(2)

  await test.signIn('user-two')
  await test.signIn('user-one')
  request(test, 'after-other-account')
  expect(test.processes).toHaveLength(2)
  // The first request and this one asked.
  expect(test.notify).toHaveBeenCalledTimes(2)

  request(test, 'again', true)
  expect(test.processes).toHaveLength(3)
  test.sessions.signedOut()
  request(test, 'after-sign-out')
  expect(test.processes).toHaveLength(3)
})

it('turns the 15 minutes into a grant until Stop through a settings operation', async () => {
  const test = deviceLifecycleFixture()
  await test.start()
  const sent = test.command({
    requestId: 'first',
    workspaceId: 'workspace-one',
  })
  test.receive({ type: 'command.request', request: sent })
  test.receive({
    type: 'command.approval',
    workspaceId: 'workspace-one',
    requestId: 'first',
    operationId: 'answer-first',
    action: 'allow-workspace-15-minutes',
  })
  test.receive({
    type: 'settings.operation',
    operationId: 'keep',
    operation: { action: 'keep-workspace', workspaceId: 'workspace-one' },
  })
  expect(test.messages().at(-1)).toMatchObject({
    type: 'settings.result',
    operationId: 'keep',
    outcome: { status: 'done' },
    settings: {
      workspaceWindows: [{ workspaceId: 'workspace-one', expiresAt: null }],
    },
  })
  // The connection misses its heartbeats meanwhile, so it reconnects.
  test.advance(3_600_000)
  test.connection.sleep()
  await test.connection.wake()
  test.pair()
  request(test, 'later')
  expect(test.processes).toHaveLength(2)
})
