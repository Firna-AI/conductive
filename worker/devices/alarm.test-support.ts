import { expect } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import { deviceNumber, deviceObject } from '../../src/shared/device-read'
import { deviceTestPath } from './clock.test-support'
import { deviceBrokerName } from './paths'
import { APP, WID, type DeviceFixture } from './runtime.test-support'

export function deviceClock(fixture: DeviceFixture) {
  const broker = deviceBrokerName('sender')
  const request = async (
    action: 'clock' | 'alarm',
    target: string,
    body?: unknown,
  ) => {
    const response = await fixture.runtime.dispatchFetch(
      APP + deviceTestPath(action, target),
      {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      },
    )
    expect(response.status).toBe(200)
    return deviceObject(await response.json())
  }
  return {
    set: async (now: number) => {
      await request('clock', WID, { now })
      await request('clock', broker, { now })
    },
    scheduled: async () => deviceNumber((await request('clock', broker)).alarm),
    runAlarm: () => request('alarm', broker, {}),
    restartBroker: async () => {
      const response = await fixture.runtime.dispatchFetch(
        APP + deviceTestPath('restart', broker),
        { method: 'POST' },
      )
      expect(response.status).toBe(500)
    },
  }
}

export async function throughEventNumber(fixture: DeviceFixture) {
  const response = await fixture.app(
    chatHistoryPath('org', WID, fixture.sessionId),
  )
  expect(response.status).toBe(200)
  return deviceNumber(deviceObject(await response.json()).throughEventNumber)
}
