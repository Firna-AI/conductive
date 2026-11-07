import { afterEach, expect, it } from 'vitest'

import { deviceRequired } from '../../src/shared/device-read'
import { deviceBrokerName, DEVICE_INTERNAL_PATH } from './paths'
import { createDeviceProof } from './proof'
import { APP, deviceFixture, type DeviceFixture } from './runtime.test-support'

let fixture: DeviceFixture
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps the private device entry at 1 MB when a signed call bypasses the application', async () => {
  fixture = await deviceFixture()
  const bindings = await fixture.runtime.getBindings<{
    SESSION_SIGNING_KEY: string
    WORKSPACES: DurableObjectNamespace
  }>()
  const secret = deviceRequired(bindings.SESSION_SIGNING_KEY)
  const namespace = bindings.WORKSPACES
  const target = deviceBrokerName('sender')
  const stub = namespace.get(namespace.idFromName(target))
  const operation = { type: 'broker.target', userId: 'sender' }
  const payload = (extra: string) =>
    JSON.stringify({ target, operation, extra })
  const send = async (body: string) =>
    stub.fetch(APP + DEVICE_INTERNAL_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Conducting-Device-Proof': await createDeviceProof(
          target,
          body,
          secret,
        ),
      },
      body,
    })
  const padding = 1_000_000 - new TextEncoder().encode(payload('')).byteLength
  const exact = await send(payload('x'.repeat(padding)))
  expect(exact.status).toBe(200)
  expect(await exact.json()).toEqual({
    device: null,
    deviceName: null,
    sessionId: null,
  })
  const oversized = await send(payload('x'.repeat(padding + 1)))
  expect(oversized.status).toBe(413)
  expect(await oversized.json()).toEqual({
    error: {
      code: 'body_too_large',
      message: 'The request is too large. Send less data.',
    },
  })
})
