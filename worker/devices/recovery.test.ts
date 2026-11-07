import { afterEach, expect, it, vi } from 'vitest'

import { MemoryChatStorage } from '../chat/memory-storage.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { DeviceBroker } from './broker'
import { deviceApprovalPath, deviceCommandsPath } from '../../src/shared/device'
import { deviceObject, readDeviceRecord } from '../../src/shared/device-read'
import { deviceFixture, WID } from './runtime.test-support'
import {
  connected,
  ref,
  sendFrame,
  workspaceState,
} from './requests.test-support'
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

it('repairs an interrupted publication through browser replay after a workspace restart', async () => {
  const fixture = await deviceFixture()
  try {
    const mac = await connected(fixture)
    await fixture.db
      .prepare(
        `CREATE TRIGGER fail_device_publication BEFORE UPDATE OF state ON workspaces
       WHEN NEW.id = 'device-workspace' AND NEW.state = 'input'
       BEGIN SELECT RAISE(ABORT, 'device publication failed'); END`,
      )
      .run()
    try {
      expect((await fixture.machine(fixture.input())).status).toBe(500)
      expect(await workspaceState(fixture)).toBe('working')
    } finally {
      await fixture.db.prepare('DROP TRIGGER fail_device_publication').run()
    }
    const closed = new Promise<void>((resolve) =>
      fixture.runner.addEventListener('close', () => resolve(), { once: true }),
    )
    fixture.runner.close(1000, 'Restart after publication failure')
    await closed
    await fixture.runtime.unsafeEvictDurableObject(
      'device-tests',
      'Workspace',
      { name: WID },
    )
    const replay = await fixture.app(deviceCommandsPath('org', WID))
    expect(replay.status).toBe(200)
    expect(await workspaceState(fixture)).toBe('input')
    const records = deviceObject(await replay.json()).requests
    if (!Array.isArray(records)) throw new Error('Missing device records.')
    expect(records).toHaveLength(1)
    const request = readDeviceRecord(records[0])
    expect(request.state).toBe('waiting')
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.request',
      request: { requestId: 'command-1', requestKey: request.requestKey },
    })
    const denied = await fixture.app(
      deviceApprovalPath('org', WID, request.requestKey),
      { ...mac.device, action: 'deny' },
      fixture.senderToken,
      true,
    )
    expect(denied.status).toBe(202)
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.approval',
      action: 'deny',
      ...ref(),
    })
    await sendFrame(mac, { type: 'command.denied', ...ref() })
    expect(await workspaceState(fixture)).toBe('working')
  } finally {
    await fixture.dispose()
  }
})
