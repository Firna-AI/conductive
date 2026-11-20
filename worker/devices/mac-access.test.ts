import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import { workspaceEventsPath } from '../../src/shared/events'
import { deviceNumber, deviceObject } from '../../src/shared/device-read'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
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

it('notifies every connected member when Mac access turns off without a waiting request', async () => {
  const observe = async (token: string, after = 0) => {
    const response = await fixture.runtime.dispatchFetch(
      APP + workspaceEventsPath('org', WID, after),
      { headers: { ...fixture.appHeaders(token), Upgrade: 'websocket' } },
    )
    expect(response.status).toBe(101)
    if (!response.webSocket) throw new Error('Missing workspace observer.')
    fixture.remember(response.webSocket)
    const inbox = new SocketInbox(response.webSocket)
    response.webSocket.accept()
    const message = deviceObject(await inbox.next())
    expect(message.type).toBe('history')
    return { inbox, history: deviceObject(message.history) }
  }
  const observers = await Promise.all(
    [fixture.senderToken, fixture.ownerToken].map((token) => observe(token)),
  )
  const through = deviceNumber(observers[0].history.throughEventNumber)
  await setMacAccess(false)
  const update = {
    eventNumber: through + 1,
    event: { type: 'workspace.updated', workspace: { id: WID } },
  }
  const replay = await observe(fixture.senderToken, through)
  expect(replay.history.events).toEqual([
    expect.objectContaining({
      eventNumber: through + 1,
      event: expect.objectContaining({
        type: 'workspace.updated',
        workspace: expect.objectContaining({ id: WID }),
      }),
    }),
  ])
  for (const observer of observers)
    expect(await observer.inbox.next()).toMatchObject({
      type: 'event',
      envelope: update,
    })
})

it('refuses a new Mac command while access is off and lets a member enable access again', async () => {
  const mac = await connected(fixture)
  await setMacAccess(false)
  const response = await fixture.machine(fixture.input('refused'))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    request: {
      state: 'failed',
      device: null,
      startedAt: null,
      result: null,
      error: {
        code: 'mac_access_off',
        message: 'Mac access is off in the Capabilities of this workspace.',
      },
    },
  })
  mac.socket.send(JSON.stringify({ type: 'device.ping' }))
  expect(await mac.inbox.next()).toEqual({ type: 'device.pong' })
  await mac.settle()
  expect(await workspaceState(fixture)).toBe('working')
  await setMacAccess(true)
  await command(fixture, mac, 'allowed')
})

it('ends every waiting Mac request when access turns off and keeps a running command through its result', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac, 'running')
  await sendFrame(mac, { type: 'command.approved', ...ref('running') })
  await command(fixture, mac, 'waiting-one')
  const waiting = await command(fixture, mac, 'waiting-two')
  await setMacAccess(false)
  const cancellations = [await mac.inbox.next(), await mac.inbox.next()]
  expect(cancellations).toEqual(
    expect.arrayContaining([
      { type: 'command.cancel', ...ref('waiting-one') },
      { type: 'command.cancel', ...ref('waiting-two') },
    ]),
  )
  for (const id of ['waiting-one', 'waiting-two']) {
    expect(await stored(fixture, id)).toMatchObject({
      state: 'failed',
      error: {
        code: 'mac_access_off',
        message: 'Mac access is off in the Capabilities of this workspace.',
      },
    })
  }
  expect(await workspaceState(fixture)).toBe('working')
  expect(await stored(fixture, 'running')).toMatchObject({
    state: 'running',
    error: null,
  })
  const read = await fixture.readCommand(waiting.requestKey)
  expect(read.status).toBe(200)
  expect(await read.json()).toMatchObject({
    request: { state: 'failed', error: { code: 'mac_access_off' } },
  })
  await sendFrame(mac, { type: 'command.approved', ...ref('waiting-two') })
  expect(await stored(fixture, 'waiting-two')).toMatchObject({
    state: 'failed',
    error: { code: 'mac_access_off' },
  })
  await sendFrame(mac, { type: 'command.result', ...ref('running'), result })
  expect(await stored(fixture, 'running')).toMatchObject({
    state: 'completed',
    result,
    error: null,
  })
})
