import { afterEach, beforeEach, expect, it } from 'vitest'

import { deviceObject, readDeviceRecord } from '../../src/shared/device-read'
import { hash } from '../security/crypto'
import { command, connected, ref, stored } from './requests.test-support'
import { deviceFixture, type DeviceFixture } from './runtime.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength

it('delivers a command request frame of exactly 1,000,000 bytes to the connected Mac', async () => {
  const mac = await connected(fixture)
  const sample = await command(fixture, mac, 'sample')
  const input = { ...fixture.input('exact-frame'), reason: '' }
  const request = {
    ...sample,
    ...input,
    requestKey: await hash(input.requestId),
  }
  input.reason = 'x'.repeat(
    1_000_000 - bytes({ type: 'command.request', request }),
  )
  expect(bytes(input)).toBeLessThan(1_000_000)
  const response = await fixture.machine(input)
  expect(response.status).toBe(202)
  const accepted = readDeviceRecord(deviceObject(await response.json()).request)
  const frame = await mac.inbox.next()
  expect(frame).toEqual({ type: 'command.request', request: accepted })
  expect(bytes(frame)).toBe(1_000_000)
  expect(accepted).toMatchObject({
    requestId: input.requestId,
    reason: input.reason,
    state: 'waiting',
    device: mac.device,
  })
})

it('stores a failure frame of exactly 1,000,000 bytes and keeps its Mac connection', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac)
  const failure = { type: 'command.failed', ...ref(), message: '' }
  failure.message = 'x'.repeat(1_000_000 - bytes(failure))
  expect(bytes(failure)).toBe(1_000_000)
  const reply = Promise.race([
    mac.inbox.next(),
    new Promise((resolve) => {
      mac.socket.addEventListener('close', () => resolve({ type: 'closed' }), {
        once: true,
      })
    }),
  ])
  mac.socket.send(JSON.stringify(failure))
  mac.socket.send(JSON.stringify({ type: 'device.ping' }))
  expect(await reply).toEqual({ type: 'device.pong' })
  expect(await stored(fixture)).toMatchObject({
    state: 'failed',
    device: mac.device,
    error: { code: 'command_failed', message: failure.message },
  })
})
