import { afterEach, beforeEach, expect, it } from 'vitest'

import {
  DEVICE_OUTPUT_LIMIT_BYTES,
  DEVICE_REPLACED_CLOSE_CODE,
  deviceApprovalPath,
} from '../../src/shared/device'
import { deviceObject } from '../../src/shared/device-read'
import { sessionPaths } from '../../src/shared/sessions'
import { workspaceEventsPath } from '../../src/shared/events'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
import { deviceClock } from './alarm.test-support'
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

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('selects the active stored sender instead of the owner or forged identities', async () => {
  const owner = await connected(fixture, fixture.ownerToken, 'owner-mac')
  const sender = await connected(
    fixture,
    fixture.senderToken,
    'sender-mac',
    'Actual sender Mac',
  )
  const response = await fixture.machine({
    ...fixture.input(),
    senderId: 'owner',
    ownerId: 'owner',
    deviceId: 'owner-mac',
    deviceName: 'Forged device name',
    host: 'https://other.test',
  })
  expect(response.status).toBe(202)
  expect(await response.json()).toMatchObject({
    request: {
      sender: { id: 'sender' },
      device: sender.device,
      deviceName: 'Actual sender Mac',
      startedAt: null,
    },
  })
  expect(await sender.inbox.next()).toMatchObject({
    type: 'command.request',
    request: { sender: { id: 'sender' } },
  })
  await sendFrame(owner, { type: 'command.result', ...ref(), result })
  expect((await stored(fixture)).state).toBe('waiting')
})

it('relays all four approval choices only from the paired desktop session', async () => {
  const mac = await connected(fixture)
  const otherSession = await fixture.tokenFor('sender', 'other-mac-session')
  for (const action of [
    'deny',
    'allow',
    'always-allow',
    'allow-workspace-15-minutes',
  ] as const) {
    const id = `choice-${action}`
    const request = await command(fixture, mac, id)
    const path = deviceApprovalPath('org', WID, request.requestKey)
    const body = { ...mac.device, action }
    if (action === 'deny') {
      expect((await fixture.app(path, body)).status).toBe(403)
      expect(
        (await fixture.app(path, body, fixture.ownerToken, true)).status,
      ).toBe(403)
      expect((await fixture.app(path, body, otherSession, true)).status).toBe(
        403,
      )
      expect(
        (
          await fixture.app(
            path,
            { ...body, connectionId: 'forged' },
            fixture.senderToken,
            true,
          )
        ).status,
      ).toBe(403)
    }
    expect(
      (await fixture.app(path, body, fixture.senderToken, true)).status,
    ).toBe(202)
    expect(await mac.inbox.next()).toMatchObject({
      type: 'command.approval',
      ...ref(id),
      action,
    })
    expect((await stored(fixture, id)).state).toBe('waiting')
    await sendFrame(mac, {
      type: action === 'deny' ? 'command.denied' : 'command.approved',
      ...ref(id),
    })
    expect((await stored(fixture, id)).state).toBe(
      action === 'deny' ? 'denied' : 'running',
    )
    if (action !== 'deny')
      await sendFrame(mac, { type: 'command.result', ...ref(id), result })
  }
})

it('keeps input for concurrent waits and restores it after a metadata update', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac, 'first')
  await command(fixture, mac, 'second')
  expect(await workspaceState(fixture)).toBe('input')
  await fixture.db
    .prepare(
      "UPDATE workspaces SET name = 'New name', updated_at = updated_at + 100 WHERE id = ?",
    )
    .bind(WID)
    .run()
  await sendFrame(mac, { type: 'command.approved', ...ref('first') })
  expect(await workspaceState(fixture)).toBe('input')
  await sendFrame(mac, { type: 'command.denied', ...ref('second') })
  expect(await workspaceState(fixture)).toBe('working')
  await sendFrame(mac, { type: 'command.result', ...ref('first'), result })
})

it('caps UTF-8 output and completes pending work on the original Mac socket after hibernation', async () => {
  const mac = await connected(fixture)
  const waiting = await command(fixture, mac)
  expect(waiting.startedAt).toBeNull()
  await sendFrame(mac, { type: 'command.approved', ...ref() })
  const running = await stored(fixture)
  expect(running.startedAt).toEqual(expect.any(Number))
  const restored = await deviceClock(fixture).hibernate()
  expect(restored.current).toEqual({ ok: true, value: { device: mac.device } })
  expect(restored.socketCount).toBe(1)
  await sendFrame(mac, {
    type: 'command.result',
    ...ref(),
    result: {
      ...result,
      stdout: '\u0000'.repeat(DEVICE_OUTPUT_LIMIT_BYTES),
      stderr: 'extra',
      timedOut: true,
    },
  })
  expect(await stored(fixture)).toMatchObject({
    state: 'timed-out',
    startedAt: running.startedAt,
    result: {
      stdout: '\u0000'.repeat(DEVICE_OUTPUT_LIMIT_BYTES),
      stderr: '',
      timedOut: true,
      truncated: true,
    },
  })
  fixture.runner.close(1000, 'Test restart')
  await fixture.runtime.unsafeEvictDurableObject('device-tests', 'Workspace', {
    name: WID,
  })
  expect((await stored(fixture)).state).toBe('timed-out')
})

it('retires a replaced connection and fails its work without rerouting it', async () => {
  const old = await connected(fixture)
  await command(fixture, old)
  const oldRestored = await deviceClock(fixture).hibernate()
  expect(oldRestored.current).toEqual({
    ok: true,
    value: { device: old.device },
  })
  const closed = new Promise<number>((resolve) =>
    old.socket.addEventListener('close', (event) => resolve(event.code), {
      once: true,
    }),
  )
  const next = await connected(fixture, fixture.senderToken, 'new-mac')
  const replacement = await deviceClock(fixture).hibernate()
  expect(replacement.current).toEqual({
    ok: true,
    value: { device: next.device },
  })
  expect(await closed).toBe(DEVICE_REPLACED_CLOSE_CODE)
  expect(await stored(fixture)).toMatchObject({
    state: 'unavailable',
    device: old.device,
  })
  await command(fixture, next, 'new-command')
  await sendFrame(next, { type: 'command.result', ...ref(), result })
  expect((await stored(fixture)).state).toBe('unavailable')
  await sendFrame(next, { type: 'command.denied', ...ref('new-command') })
})

it('cancels work when its turn stops and ignores late approvals and results', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac)
  const response = await fixture.app(
    sessionPaths.interrupt('org', WID, fixture.sessionId),
    { turnId: fixture.turnId },
  )
  expect(response.status).toBe(200)
  expect(await mac.inbox.next()).toMatchObject({
    type: 'command.cancel',
    ...ref(),
  })
  expect(await stored(fixture)).toMatchObject({
    state: 'failed',
    error: { code: 'turn_ended' },
  })
  await sendFrame(mac, { type: 'command.approved', ...ref() })
  await sendFrame(mac, { type: 'command.result', ...ref(), result })
  expect((await stored(fixture)).error?.code).toBe('turn_ended')
  expect(
    deviceObject(
      await (
        await fixture.app(
          '/api/devices/current',
          undefined,
          fixture.senderToken,
          true,
        )
      ).json(),
    ).device,
  ).toEqual(mac.device)
})

it('stores and publishes numbered workspace input changes on the real chat stream', async () => {
  await fixture.db
    .prepare('UPDATE workspaces SET github_summary = ? WHERE id = ?')
    .bind('checks-failed', WID)
    .run()
  const mac = await connected(fixture)
  const response = await fixture.runtime.dispatchFetch(
    APP + workspaceEventsPath('org', WID),
    {
      headers: { ...fixture.appHeaders(), Upgrade: 'websocket' },
    },
  )
  if (!response.webSocket) throw new Error('Missing workspace stream.')
  fixture.remember(response.webSocket)
  const inbox = new SocketInbox(response.webSocket)
  response.webSocket.accept()
  const history = deviceObject(await inbox.next())
  const through = deviceObject(history.history).throughEventNumber
  await command(fixture, mac)
  const waiting = deviceObject(deviceObject(await inbox.next()).envelope)
  expect(waiting).toMatchObject({
    eventNumber: Number(through) + 1,
    event: {
      type: 'workspace.updated',
      workspace: { state: 'input', github: 'checks-failed' },
    },
  })
  await sendFrame(mac, { type: 'command.denied', ...ref() })
  const answered = deviceObject(deviceObject(await inbox.next()).envelope)
  expect(answered).toMatchObject({
    eventNumber: Number(through) + 2,
    event: {
      type: 'workspace.updated',
      workspace: { state: 'working', github: 'checks-failed' },
    },
  })
  expect(JSON.stringify([waiting, answered])).not.toContain(fixture.senderToken)
})

it('cleans missing workspace records after restart and allows a new Mac to connect', async () => {
  const old = await connected(fixture)
  const request = await command(fixture, old)
  const erased = await fixture.runtime.dispatchFetch(
    APP + '/__test/clear-device-records',
  )
  expect(erased.status).toBe(200)
  const runnerClosed = new Promise<void>((resolve) =>
    fixture.runner.addEventListener('close', () => resolve(), { once: true }),
  )
  fixture.runner.close(1000, 'Restart the workspace fixture')
  await runnerClosed
  await fixture.runtime.unsafeEvictDurableObject('device-tests', 'Workspace', {
    name: WID,
  })
  const next = await connected(fixture, fixture.senderToken, 'new-mac')
  expect((await fixture.readCommand(request.requestKey)).status).toBe(404)
  await command(fixture, next, 'after-restart')
  await sendFrame(next, { type: 'command.denied', ...ref('after-restart') })
  expect((await stored(fixture, 'after-restart')).state).toBe('denied')
})
