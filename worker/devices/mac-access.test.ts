import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import {
  deviceFixture,
  APP,
  WID,
  type DeviceFixture,
} from './runtime.test-support'
import {
  command,
  connected,
  ref,
  result,
  sendFrame,
  stored,
  workspaceState,
} from './requests.test-support'
import { workerLibraryBundle } from '../test-support/test-bundles'

let fixture: DeviceFixture
beforeAll(async () => {
  await workerLibraryBundle('worker/devices/test-worker.test-support.ts')
})
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

async function setMacAccess(macAccess: boolean) {
  const response = await fixture.runtime.dispatchFetch(
    APP + workspaceCapabilitiesPath('org', WID),
    {
      method: 'PATCH',
      headers: fixture.appHeaders(),
      body: JSON.stringify({ macAccess }),
    },
  )
  expect(response.status).toBe(200)
  return response
}

it('relays a new Mac command while stored Mac access is off and keeps the field readable and writable', async () => {
  const mac = await connected(fixture)
  expect(await (await setMacAccess(false)).json()).toMatchObject({
    capabilities: { macAccess: false },
  })
  const request = await command(fixture, mac, 'access-off')
  expect(request).toMatchObject({
    state: 'waiting',
    device: mac.device,
    startedAt: null,
    result: null,
    error: null,
  })
  expect(await (await setMacAccess(true)).json()).toMatchObject({
    capabilities: { macAccess: true },
  })
})

it('keeps waiting and running Mac commands active when stored Mac access turns off', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac, 'running')
  await sendFrame(mac, { type: 'command.approved', ...ref('running') })
  await command(fixture, mac, 'waiting-one')
  const waiting = await command(fixture, mac, 'waiting-two')
  await setMacAccess(false)
  mac.socket.send(JSON.stringify({ type: 'device.ping' }))
  expect(await mac.inbox.next()).toEqual({ type: 'device.pong' })
  await mac.settle()
  for (const id of ['waiting-one', 'waiting-two']) {
    expect(await stored(fixture, id)).toMatchObject({
      state: 'waiting',
      error: null,
    })
  }
  expect(await workspaceState(fixture)).toBe('input')
  expect(await stored(fixture, 'running')).toMatchObject({
    state: 'running',
    error: null,
  })
  const read = await fixture.readCommand(waiting.requestKey)
  expect(read.status).toBe(202)
  expect(await read.json()).toMatchObject({
    request: { state: 'waiting', error: null },
  })
  await sendFrame(mac, { type: 'command.approved', ...ref('waiting-two') })
  expect(await stored(fixture, 'waiting-two')).toMatchObject({
    state: 'running',
    error: null,
  })
  await sendFrame(mac, { type: 'command.result', ...ref('running'), result })
  expect(await stored(fixture, 'running')).toMatchObject({
    state: 'completed',
    result,
    error: null,
  })
})
