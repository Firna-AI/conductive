import { expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { deviceNumber, deviceObject } from '../../src/shared/device-read'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
import { deviceClock } from './alarm.test-support'
import { deviceTestPath, DEVICE_TEST_NOW } from './clock.test-support'
import { deviceBrokerName } from './paths'
import {
  command,
  connected,
  stored,
  workspaceState,
} from './requests.test-support'
import { APP, WID, deviceFixture } from './runtime.test-support'

it('settles pending Mac work when close is the first wake event', async () => {
  const fixture = await deviceFixture()
  const broker = deviceBrokerName('sender')
  const closeHandled = async () => {
    const response = await fixture.runtime.dispatchFetch(
      APP + deviceTestPath('closed', broker),
    )
    expect(response.status).toBe(200)
    return deviceObject(await response.json())
  }
  try {
    const mac = await connected(fixture)
    const response = await fixture.runtime.dispatchFetch(
      APP + workspaceEventsPath('org', WID),
      {
        headers: { ...fixture.appHeaders(), Upgrade: 'websocket' },
      },
    )
    expect(response.status).toBe(101)
    if (!response.webSocket)
      throw new Error('The workspace observer is missing.')
    fixture.remember(response.webSocket)
    const events = new SocketInbox(response.webSocket)
    response.webSocket.accept()
    const history = deviceObject(await events.next())
    const through = deviceNumber(
      deviceObject(history.history).throughEventNumber,
    )
    const request = await command(fixture, mac, 'cold-close')
    const waiting = deviceObject(deviceObject(await events.next()).envelope)
    expect(waiting).toMatchObject({
      eventNumber: through + 1,
      event: { type: 'workspace.updated', workspace: { state: 'input' } },
    })
    const before = await deviceClock(fixture).ready()
    expect(await deviceClock(fixture).scheduled()).toBe(
      DEVICE_TEST_NOW + 10_000,
    )
    // Model a disconnected socket omitted from the next constructor listing.
    expect(
      (
        await fixture.runtime.dispatchFetch(
          APP + deviceTestPath('closed', broker),
          { method: 'POST' },
        )
      ).status,
    ).toBe(200)
    await fixture.runtime.unsafeEvictDurableObject(
      'device-tests',
      'Workspace',
      { name: broker, webSockets: 'hibernate' },
    )
    expect(mac.socket.readyState).toBe(1)
    const closed = new Promise<void>((resolve) =>
      mac.socket.addEventListener('close', () => resolve(), { once: true }),
    )
    mac.socket.close(1000, 'Close the sleeping Mac.')
    const after = await closeHandled()
    expect(after.instance).not.toBe(before.instance)
    expect(after.closeEvent).toEqual({
      first: 'close',
      completed: 1,
      errors: 0,
      omitted: 1,
      omittedIds: [mac.device.connectionId],
    })
    expect(await workspaceState(fixture)).toBe('working')
    expect(after.current).toBeNull()
    expect(after.pending).toBe(0)
    expect(after.alarm).toBeNull()
    expect(after.now).toBe(DEVICE_TEST_NOW)
    await closed
    const settled = deviceObject(deviceObject(await events.next()).envelope)
    expect(settled).toMatchObject({
      eventNumber: through + 2,
      event: { type: 'workspace.updated', workspace: { state: 'working' } },
    })
    expect(await stored(fixture, 'cold-close')).toMatchObject({
      requestKey: request.requestKey,
      state: 'unavailable',
      device: mac.device,
    })
    expect(mac.inbox.received.map((value) => deviceObject(value).type)).toEqual(
      ['device.connected', 'command.request'],
    )
    await deviceClock(fixture).ready()
    const again = await closeHandled()
    expect(again.closeEvent).toEqual(after.closeEvent)
    expect(again.pending).toBe(0)
    expect(events.received.map((value) => deviceObject(value).type)).toEqual([
      'history',
      'event',
      'event',
    ])
  } finally {
    await fixture.dispose()
  }
})
