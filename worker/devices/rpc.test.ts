import { afterEach, beforeEach, expect, it } from 'vitest'

import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { Workspace } from './test-worker.test-support'
import { deviceCall } from './internal'
import { deviceBrokerName } from './paths'
import { APP, deviceFixture, type DeviceFixture } from './runtime.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

async function binding(fixture: DeviceFixture) {
  return fixture.runtime.getBindings<
    Omit<AppEnv, 'WORKSPACES'> & {
      WORKSPACES: DurableObjectNamespace<Workspace>
    }
  >()
}

it('checks the receiving object identity before an RPC operation reads records', async () => {
  const env = await binding(fixture)
  const target = deviceBrokerName('sender')
  const broker = env.WORKSPACES.getByName(target)
  expect(
    await broker.deviceOperation('another-workspace', {
      type: 'workspace.validate',
      requestId: 'missing-request',
      tokenHash: 'hash',
    }),
  ).toEqual({
    ok: false,
    status: 403,
    code: 'device_forbidden',
    message: 'The Mac request is not available.',
  })
  expect(
    await broker.deviceOperation(target, {
      type: 'broker.target',
      userId: 'sender',
    }),
  ).toEqual({
    ok: true,
    value: { device: null, deviceName: null, sessionId: null },
  })
})

it('keeps the RPC failure status and code in a local HttpError', async () => {
  const env = await binding(fixture)
  const failure = deviceCall(env, deviceBrokerName('sender'), {
    type: 'broker.current',
    userId: '',
    sessionId: 'session',
  })
  await expect(failure).rejects.toBeInstanceOf(HttpError)
  await expect(failure).rejects.toMatchObject({
    status: 400,
    code: 'invalid_input',
    message: 'Complete the Mac request fields.',
  })
})

it('does not expose the retired device operation through HTTP', async () => {
  const env = await binding(fixture)
  const target = deviceBrokerName('sender')
  const response = await env.WORKSPACES.getByName(target).fetchDeviceRequest(
    new Request(APP + '/__devices/operation', {
      method: 'POST',
      headers: fixture.appHeaders(),
      body: JSON.stringify({
        target,
        operation: { type: 'broker.target', userId: 'sender' },
      }),
    }),
  )
  expect(response.status, await response.text()).toBe(404)
})
