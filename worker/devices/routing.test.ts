import { afterEach, beforeEach, expect, it } from 'vitest'

import { deviceFixture, type DeviceFixture } from './runtime.test-support'
import { deviceObject, readDeviceRecord } from '../../src/shared/device-read'
import {
  connected,
  command,
  sendFrame,
  ref,
  workspaceState,
} from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('routes a machine request through the real Worker and stores the active sender offline', async () => {
  const response = await fixture.machine(fixture.input())
  expect(response.status).toBe(200)
  const body: unknown = await response.json()
  expect(body).toMatchObject({
    request: {
      requestId: 'command-1',
      state: 'unavailable',
      sender: { id: 'sender' },
      command: ' echo exact ',
      folder: '/Users/sender/project ',
      device: null,
      deviceName: null,
      startedAt: null,
    },
  })
  expect(
    readDeviceRecord(deviceObject(body).request).longerTimeoutReason,
  ).toBeNull()
})

it('rejects stale turns and validates time limits through the machine handler', async () => {
  expect(
    (await fixture.machine(fixture.input(), '', 'forged-turn')).status,
  ).toBe(403)
  for (const timeoutSeconds of [0, -1, 1.5, 1801, 121]) {
    expect(
      (await fixture.machine({ ...fixture.input(), timeoutSeconds })).status,
    ).toBe(400)
  }
  const response = await fixture.machine({
    ...fixture.input(),
    timeoutSeconds: 1800,
    longerTimeoutReason: 'A long local build',
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    request: {
      timeoutSeconds: 1800,
      longerTimeoutReason: 'A long local build',
    },
  })
})

it('bounds new machine JSON bodies before parsing them', async () => {
  const response = await fixture.machine({
    ...fixture.input(),
    command: 'x'.repeat(1_000_001),
  })
  expect(response.status).toBe(413)
  expect(await response.json()).toMatchObject({
    error: { code: 'body_too_large' },
  })
})

it('keeps large allowed command records and opaque request IDs durably', async () => {
  const requestId = 'opaque-🌱'.repeat(40)
  const command = 'echo large '.repeat(20_000)
  const response = await fixture.machine({
    ...fixture.input(requestId),
    command,
  })
  expect(response.status).toBe(200)
  const reply = await response.json()
  expect(reply).toMatchObject({
    request: { requestId, command, state: 'unavailable' },
  })
  const record = readDeviceRecord(deviceObject(reply).request)
  const stored = await fixture.readCommand(record.requestKey)
  expect(stored.status).toBe(200)
  expect(await stored.json()).toMatchObject({ request: { requestId, command } })
})

it('sets input for an active turn while the workspace still starts', async () => {
  const mac = await connected(fixture)
  await fixture.db.prepare("UPDATE workspaces SET state = 'starting'").run()
  await command(fixture, mac)
  expect(await workspaceState(fixture)).toBe('input')
  await sendFrame(mac, { type: 'command.denied', ...ref() })
  expect(await workspaceState(fixture)).toBe('starting')
})
