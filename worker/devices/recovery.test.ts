import { afterEach, expect, it, vi } from 'vitest'

import { createChatFixture } from '../chat/harness.test-support'
import { MemoryChatStorage } from '../chat/memory-storage.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { DeviceBroker } from './broker'
import { readDeviceRecord, deviceObject } from '../../src/shared/device-read'
import { publishDeviceState } from './state'
import type { DeviceConnection } from './broker-types'

let harness: TestHarness | undefined
afterEach(async () => {
  vi.useRealTimers()
  await harness?.dispose()
  harness = undefined
})

it('removes a failed settings send and handles its waiter rejection', async () => {
  harness = await createHarness()
  const broker = new DeviceBroker(
    new MemoryChatStorage(),
    harness.env,
    async () => undefined,
  )
  const connection: DeviceConnection = {
    userId: 'user',
    sessionId: 'session',
    device: { deviceId: 'mac', connectionId: 'connection' },
    deviceName: null,
    lastSeen: 1,
    send: () => {
      throw new Error('Closed socket')
    },
    close: () => undefined,
  }
  vi.useFakeTimers()
  await expect(
    broker.relaySettings(connection, { action: 'read' }),
  ).rejects.toMatchObject({ code: 'device_unavailable' })
  expect(broker.settings.size).toBe(0)
  await vi.runAllTimersAsync()
})

it('repairs an input marker committed before the D1 state transition', async () => {
  harness = await createHarness()
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const response = await fixture.send(session.id)
  const turn = await fixture.chat.store.read('workspace-chat', (view) =>
    view.turn(response.turnId ?? ''),
  )
  // The public state publisher needs a real session choice and workspace data.
  const request = readDeviceRecord({
    requestId: 'request',
    workspaceId: 'workspace-chat',
    orgId: fixture.org.id,
    workspaceName: 'Test',
    sessionId: session.id,
    turnId: turn?.id ?? 'queued',
    sender: {
      id: fixture.owner.id,
      githubLogin: 'owner',
      displayName: null,
      avatarUrl: null,
    },
    device: null,
    deviceName: null,
    command: 'echo',
    folder: '/',
    reason: 'Check',
    timeoutSeconds: 60,
    longerTimeoutReason: null,
    state: 'waiting',
    result: null,
    error: null,
    createdAt: 1,
    startedAt: null,
    updatedAt: 1,
  })
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'working' WHERE id = 'workspace-chat'",
  ).run()
  await fixture.storage.put('devices:v1:input-state', { previous: 'working' })
  await publishDeviceState(
    fixture.storage,
    fixture.chat,
    fixture.env,
    request,
    true,
  )
  const state = async () =>
    deviceObject(
      await harness?.env.DB.prepare(
        "SELECT state FROM workspaces WHERE id = 'workspace-chat'",
      ).first(),
    ).state
  expect(await state()).toBe('input')
  await publishDeviceState(
    fixture.storage,
    fixture.chat,
    fixture.env,
    request,
    false,
  )
  expect(await state()).toBe('working')
})
