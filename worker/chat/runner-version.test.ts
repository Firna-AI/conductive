import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { WorkspaceToRunner } from '../../src/shared/runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { FakeRunner } from '../test-support/fake-runner'
import {
  createChatFixture,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('closes a version 1 runner below the workspace pin before welcome or commands', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(session.id)
  await harness.env.DB.prepare(
    'UPDATE workspaces SET runner_protocol_version = 2 WHERE id = ?',
  )
    .bind(WORKSPACE_ID)
    .run()
  const runner = new FakeRunner({ workspaceId: WORKSPACE_ID })
  runner.emit({ type: 'runner.ready' })
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await fixture.connect(runner)
    expect(fixture.transport.closedConnections).toBe(1)
    expect(runner.received).toEqual([])
    expect(runner.commands).toEqual([])
    expect(
      await fixture.chat.readWorkspace(WORKSPACE_ID, (view) => view.pending()),
    ).toMatchObject([{ type: 'turn', messageId: 'message-1' }])
    expect(warning).toHaveBeenCalledWith(
      `The runner of workspace ${WORKSPACE_ID} closes because its protocol version does not meet the workspace version pin.`,
    )
  } finally {
    warning.mockRestore()
  }
})

it('accepts a version 1 runner and delivers queued commands when the workspace has no pin', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(session.id)
  const runner = new FakeRunner({ workspaceId: WORKSPACE_ID })
  runner.emit({ type: 'runner.ready' })
  await fixture.connect(runner)
  expect(fixture.transport.closedConnections).toBe(0)
  expect(runner.received[0]).toEqual({
    type: 'welcome',
    protocolVersion: 1,
    streamId: 'fake-stream-1',
    confirmedThrough: 0,
  })
  expect(runner.commands).toMatchObject([
    { type: 'turn', message: { id: 'message-1' } },
  ])
})

it('closes an unsupported runner version before welcome or queued commands', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(session.id)
  const sent: WorkspaceToRunner[] = []
  let closed = 0
  const peer = {
    send: (message: WorkspaceToRunner) => {
      sent.push(message)
    },
    close: () => {
      closed++
    },
  }
  await fixture.chat.connectRunner(
    new Request(`${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`, {
      headers: { Authorization: `Bearer ${WORKSPACE_TOKEN}` },
    }),
    peer,
  )
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await expect(
      fixture.chat.receiveRunner(peer, {
        type: 'hello',
        protocolVersion: 3,
        workspaceId: WORKSPACE_ID,
        streamId: 'unsupported-stream',
      }),
    ).rejects.toMatchObject({ status: 400, code: 'invalid_input' })
    expect(closed).toBe(1)
    expect(sent).toEqual([])
    expect(
      await fixture.chat.readWorkspace(WORKSPACE_ID, (view) => view.pending()),
    ).toMatchObject([{ type: 'turn', messageId: 'message-1' }])
  } finally {
    warning.mockRestore()
    fixture.chat.closeConnections()
  }
})
