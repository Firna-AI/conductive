import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { createHarness, type TestHarness } from '../test-support/harness'
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
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('warns once per runner connection and disconnect, including sockets without hello', async () => {
  const fixture = await createChatFixture(harness)
  const { peers, controls } = fixture.actor.api
  await controls.captureWarnings(true)
  const request = {
    url: `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
    headers: { Authorization: `Bearer ${WORKSPACE_TOKEN}` },
  }
  const metadata = {
    workspaceId: 'unknown',
    connectionId: 'unknown',
    streamId: '12345678-1234-4234-8234-123456789abc',
    protocolVersion: 2,
  }
  const hello = {
    type: 'hello',
    workspaceId: WORKSPACE_ID,
    streamId: metadata.streamId,
    protocolVersion: 2,
  }
  const connected = {
    kind: 'runner_connected',
    message: 'The runner of a workspace connected.',
    ...metadata,
  }
  const disconnected = {
    kind: 'runner_disconnected',
    message: 'The runner of a workspace disconnected.',
    ...metadata,
  }
  try {
    await peers.connectRunner('first', request)
    expect(await controls.warningCalls()).toEqual([])
    await peers.receiveRunner('first', hello)
    expect(await controls.warningCalls()).toEqual([[connected]])
    await peers.connectRunner('second', request)
    await peers.receiveRunner('second', hello)
    await peers.close('first')
    await peers.close('first')
    await peers.close('second')
    await peers.close('second')
    await controls.drainBackground()
    expect(await controls.warningCalls()).toEqual([
      [connected],
      [disconnected],
      [connected],
      [disconnected],
    ])
    await peers.connectRunner('no-hello', request)
    await peers.close('no-hello')
    await peers.close('no-hello')
    await controls.drainBackground()
    expect(await controls.warningCalls()).toEqual([
      [connected],
      [disconnected],
      [connected],
      [disconnected],
      [{ ...connected, streamId: null, protocolVersion: null }],
      [{ ...disconnected, streamId: null, protocolVersion: null }],
    ])
  } finally {
    await controls.captureWarnings(false)
    await fixture.chat.closeConnections()
  }
})
