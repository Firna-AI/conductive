import { expect } from 'vitest'
import type { DeviceToWorker } from '../../src/shared/device'
import {
  deviceObject,
  readDevicePairing,
  readDeviceRecord,
} from '../../src/shared/device-read'
import { deviceCommandsPath } from '../../src/shared/device'
import { APP, WID, type DeviceFixture } from './runtime.test-support'
import { deviceTestPath } from './clock.test-support'
import { deviceBrokerName } from './paths'

export async function connected(
  fixture: DeviceFixture,
  token = fixture.senderToken,
  id = 'sender-mac',
  deviceName?: string,
) {
  const result = await fixture.connect(token, id, true, deviceName)
  expect(result.response.status).toBe(101)
  if (!result.socket || !result.inbox)
    throw new Error(`Device connection returned ${result.response.status}.`)
  return {
    socket: result.socket,
    inbox: result.inbox,
    device: readDevicePairing(result.device),
    settle: async () => {
      const user = token === fixture.ownerToken ? 'owner' : 'sender'
      const ready = await fixture.runtime.dispatchFetch(
        APP + deviceTestPath('ready', deviceBrokerName(user)),
      )
      expect(ready.status).toBe(200)
    },
  }
}
export type ConnectedMac = Awaited<ReturnType<typeof connected>>
export async function sendFrame(mac: ConnectedMac, message: DeviceToWorker) {
  mac.socket.send(JSON.stringify(message))
  await mac.settle()
  mac.socket.send(JSON.stringify({ type: 'device.ping' }))
  expect(await mac.inbox.next()).toEqual({ type: 'device.pong' })
  await mac.settle()
}
export async function command(
  fixture: DeviceFixture,
  mac: ConnectedMac,
  id = 'command-1',
) {
  const response = await fixture.machine(fixture.input(id))
  expect(response.status).toBe(202)
  expect(await mac.inbox.next()).toMatchObject({
    type: 'command.request',
    request: { requestId: id },
  })
  return readDeviceRecord(deviceObject(await response.json()).request)
}
export async function stored(fixture: DeviceFixture, id = 'command-1') {
  const response = await fixture.app(
    deviceCommandsPath('org', WID),
    undefined,
    fixture.ownerToken,
  )
  expect(response.status).toBe(200)
  const list = deviceObject(await response.json()).requests
  if (!Array.isArray(list)) throw new Error('Missing device records.')
  const result = list
    .map(readDeviceRecord)
    .find((item) => item.requestId === id)
  if (!result) throw new Error('Missing command record.')
  return result
}
export async function workspaceState(fixture: DeviceFixture) {
  return (
    await fixture.db
      .prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(WID)
      .first<{ state: string }>()
  )?.state
}
export const ref = (requestId = 'command-1') => ({
  requestId,
  workspaceId: WID,
})
export const result = {
  stdout: 'local output',
  stderr: '',
  exitCode: 0,
  timedOut: false,
  truncated: false,
}
