import { afterEach, beforeEach, expect, it } from 'vitest'

import {
  deviceApprovalPath,
  DEVICE_SETTINGS_PATH,
} from '../../src/shared/device'
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
import { deviceClock } from './alarm.test-support'
import { DEVICE_TEST_NOW } from './clock.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('requires main-process cookie proof and the exact desktop Origin on device connections', async () => {
  expect(
    (await fixture.connect(fixture.senderToken, 'mac', false)).response.status,
  ).toBe(403)
  const wrongOrigin = await fixture.runtime.dispatchFetch(
    APP + '/api/devices/connect?deviceId=mac',
    {
      headers: {
        ...fixture.appHeaders(),
        Authorization: `Bearer ${fixture.senderToken}`,
        Upgrade: 'websocket',
      },
    },
  )
  expect(wrongOrigin.status).toBe(403)
  await connected(fixture)
  const clock = deviceClock(fixture)
  expect((await clock.ready()).autoResponse).toBe('{"type":"device.ping"}')
  expect((await clock.ready(WID)).autoResponse).toBeNull()
})

it.each([
  ['revoked token', 'UPDATE workspace_tokens SET revoked_at = 1', 401],
  ['removed sender', "DELETE FROM org_members WHERE user_id = 'sender'", 403],
  [
    'archived workspace',
    "UPDATE workspaces SET archived_at = 1, state = 'archived'",
    401,
  ],
  ['deleted org', 'UPDATE orgs SET deleted_at = 1', 401],
  ['suspended org', 'UPDATE orgs SET suspended_at = 1', 401],
] as const)(
  'rejects a %s after the original turn was stored',
  async (_name, query, status) => {
    await fixture.db.prepare(query).run()
    expect((await fixture.machine(fixture.input())).status).toBe(status)
  },
)

it.each([
  ['signed-out', "DELETE FROM sessions WHERE id = 'sender-session'", null],
  [
    'expired',
    "UPDATE sessions SET expires_at = 1 WHERE id = 'sender-session'",
    null,
  ],
  [
    'unreadable',
    'ALTER TABLE sessions RENAME TO unavailable_sessions',
    'ALTER TABLE unavailable_sessions RENAME TO sessions',
  ],
] as const)(
  'fails work after the target desktop session becomes %s',
  async (_name, query, restore) => {
    const mac = await connected(fixture)
    await command(fixture, mac)
    const clock = deviceClock(fixture)
    const restored = await clock.hibernate()
    expect(restored.current).toEqual({
      ok: true,
      value: { device: mac.device },
    })
    const closed = new Promise<number>((resolve) =>
      mac.socket.addEventListener('close', (event) => resolve(event.code), {
        once: true,
      }),
    )
    await fixture.db.prepare(query).run()
    try {
      await clock.set(DEVICE_TEST_NOW + 10_000)
      await clock.runAlarm()
      expect(await closed).toBe(1000)
    } finally {
      if (restore) await fixture.db.prepare(restore).run()
    }
    expect(await stored(fixture)).toMatchObject({
      state: 'unavailable',
      error: { code: 'device_unavailable' },
    })
  },
)

it.each(['stopped', 'archived', 'error'] as const)(
  'preserves a newer %s state when the wait ends',
  async (state) => {
    const mac = await connected(fixture)
    await command(fixture, mac)
    await fixture.db
      .prepare(
        'UPDATE workspaces SET state = ?, updated_at = updated_at + 1 WHERE id = ?',
      )
      .bind(state, WID)
      .run()
    expect((await stored(fixture)).state).toBe('unavailable')
    expect(await workspaceState(fixture)).toBe(state)
  },
)

it('fails sleeping work and prevents a result from completing another request', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac, 'first')
  await command(fixture, mac, 'second')
  await sendFrame(mac, { type: 'command.approved', ...ref('first') })
  await sendFrame(mac, {
    type: 'command.result',
    workspaceId: 'another-workspace',
    requestId: 'first',
    result,
  })
  expect((await stored(fixture, 'first')).state).toBe('running')
  expect((await stored(fixture, 'second')).state).toBe('waiting')
  const closed = new Promise<void>((resolve) =>
    mac.socket.addEventListener('close', () => resolve(), { once: true }),
  )
  mac.socket.send(JSON.stringify({ type: 'device.sleep' }))
  await closed
  expect((await stored(fixture, 'first')).state).toBe('unavailable')
  expect((await stored(fixture, 'second')).state).toBe('unavailable')
})

it('bounds device writes and preserves the original Origin gate', async () => {
  const mac = await connected(fixture)
  const request = await command(fixture, mac)
  const large = { ...mac.device, action: 'allow', extra: 'x'.repeat(1_000_001) }
  const path = deviceApprovalPath('org', WID, request.requestKey)
  expect(
    (await fixture.app(path, large, fixture.senderToken, true)).status,
  ).toBe(413)
  expect(
    (
      await fixture.app(
        DEVICE_SETTINGS_PATH,
        {
          ...mac.device,
          operation: {
            action: 'remove-command',
            command: 'x'.repeat(1_000_001),
          },
        },
        fixture.senderToken,
        true,
      )
    ).status,
  ).toBe(413)
  const noOrigin = await fixture.runtime.dispatchFetch(APP + path, {
    method: 'POST',
    headers: {
      Cookie: fixture.appHeaders(fixture.senderToken, true).Cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...mac.device, action: 'allow' }),
  })
  expect(noOrigin.status).toBe(403)
})

it('bounds socket frames and settles work when its Mac connection closes', async () => {
  const mac = await connected(fixture)
  await command(fixture, mac)
  const outcome = new Promise<string>((resolve) => {
    mac.socket.addEventListener('close', () => resolve('closed'), {
      once: true,
    })
    mac.socket.addEventListener('message', () => resolve('message'), {
      once: true,
    })
  })
  mac.socket.send(
    JSON.stringify({ type: 'device.ping', extra: 'x'.repeat(1_000_001) }),
  )
  expect(await outcome).toBe('closed')
  expect((await stored(fixture)).state).toBe('unavailable')
})

it('refuses suspended org approvals and late Mac results while keeping the account device connected', async () => {
  const mac = await connected(fixture)
  const waiting = await command(fixture, mac, 'waiting')
  await command(fixture, mac, 'running')
  await sendFrame(mac, { type: 'command.approved', ...ref('running') })
  await fixture.db
    .prepare("UPDATE orgs SET suspended_at = 1 WHERE id = 'org'")
    .run()
  const approval = await fixture.app(
    deviceApprovalPath('org', WID, waiting.requestKey),
    { ...mac.device, action: 'allow' },
    fixture.senderToken,
    true,
  )
  expect(approval.status).toBe(403)
  expect(await approval.json()).toMatchObject({
    error: { code: 'org_suspended' },
  })
  mac.socket.send(
    JSON.stringify({ type: 'command.approved', ...ref('waiting') }),
  )
  mac.socket.send(
    JSON.stringify({ type: 'command.result', ...ref('running'), result }),
  )
  await mac.settle()
  mac.socket.send(JSON.stringify({ type: 'device.ping' }))
  expect(await mac.inbox.next()).toEqual({
    type: 'command.cancel',
    ...ref('waiting'),
  })
  expect(await mac.inbox.next()).toEqual({
    type: 'command.cancel',
    ...ref('running'),
  })
  expect(await mac.inbox.next()).toEqual({ type: 'device.pong' })
  expect(await stored(fixture, 'waiting')).toMatchObject({
    state: 'unavailable',
    error: { code: 'device_unavailable' },
    result: null,
  })
  expect(await stored(fixture, 'running')).toMatchObject({
    state: 'unavailable',
    error: { code: 'device_unavailable' },
    result: null,
  })
})
