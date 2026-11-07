import { afterEach, beforeEach, expect, it } from 'vitest'

import { deviceObject, readDeviceRecord } from '../../src/shared/device-read'
import { deviceClock, throughEventNumber } from './alarm.test-support'
import { DEVICE_TEST_NOW } from './clock.test-support'
import { deviceFixture, type DeviceFixture } from './runtime.test-support'
import {
  command,
  connected,
  ref,
  result,
  sendFrame,
  stored,
  workspaceState,
} from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps a live lease before its deadline and settles waiting work at its alarm', async () => {
  const mac = await connected(fixture)
  const clock = deviceClock(fixture)
  await command(fixture, mac)
  const deadline = DEVICE_TEST_NOW + 30_000
  expect(await clock.scheduled()).toBe(deadline)
  await clock.set(deadline - 1)
  await clock.runAlarm()
  expect(await workspaceState(fixture)).toBe('input')
  expect((await stored(fixture)).state).toBe('waiting')
  expect(await clock.scheduled()).toBe(deadline)
  await clock.set(deadline)
  await clock.runAlarm()
  expect(await workspaceState(fixture)).toBe('working')
  expect(await stored(fixture)).toMatchObject({
    state: 'unavailable',
    error: { code: 'device_unavailable' },
  })
})

it('keeps an executing command before its watchdog and times it out at its alarm', async () => {
  const mac = await connected(fixture)
  const clock = deviceClock(fixture)
  const response = await fixture.machine({
    ...fixture.input(),
    timeoutSeconds: 1,
  })
  expect(response.status).toBe(202)
  const request = readDeviceRecord(deviceObject(await response.json()).request)
  expect(await mac.inbox.next()).toMatchObject({ type: 'command.request' })
  await sendFrame(mac, { type: 'command.approved', ...ref() })
  expect(await stored(fixture)).toMatchObject({
    state: 'running',
    startedAt: DEVICE_TEST_NOW,
  })
  const before = await throughEventNumber(fixture)
  const deadline = DEVICE_TEST_NOW + 11_000
  expect(await clock.scheduled()).toBe(deadline)
  await clock.set(deadline - 1)
  await clock.runAlarm()
  expect(await throughEventNumber(fixture)).toBe(before)
  expect((await stored(fixture)).state).toBe('running')
  await clock.set(deadline)
  await clock.runAlarm()
  // Chat history does not reconcile device commands. Only the alarm publishes.
  expect(await throughEventNumber(fixture)).toBe(before + 1)
  expect(await mac.inbox.next()).toEqual({ type: 'command.cancel', ...ref() })
  expect(await stored(fixture)).toMatchObject({
    requestKey: request.requestKey,
    state: 'timed-out',
    startedAt: DEVICE_TEST_NOW,
    result: {
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: true,
      truncated: false,
    },
  })
  await sendFrame(mac, { type: 'command.result', ...ref(), result })
  expect(await stored(fixture)).toMatchObject({
    state: 'timed-out',
    result: { stdout: '', exitCode: null, timedOut: true },
  })
})

it('settles durable waiting work when the restarted broker reaches its saved alarm', async () => {
  const mac = await connected(fixture)
  const clock = deviceClock(fixture)
  await command(fixture, mac)
  const deadline = DEVICE_TEST_NOW + 30_000
  await clock.set(deadline - 1)
  await clock.runAlarm()
  expect(await workspaceState(fixture)).toBe('input')
  await clock.restartBroker()
  expect(await clock.scheduled()).toBe(deadline)
  expect(await workspaceState(fixture)).toBe('input')
  await clock.set(deadline)
  await clock.runAlarm()
  expect(await workspaceState(fixture)).toBe('working')
  expect((await stored(fixture)).state).toBe('unavailable')
})
