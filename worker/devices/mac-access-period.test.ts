import { afterEach, beforeEach, expect, it } from 'vitest'

import { updateWorkspaceCapabilities } from '../secrets/capabilities-writes'
import { deviceFixture, WID, type DeviceFixture } from './runtime.test-support'
import { connected } from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('increments the period on each off write, keeps it on other writes, and dispatches the current period after reconnect', async () => {
  const change = async (macAccess?: boolean, userId = 'sender') => {
    await updateWorkspaceCapabilities(fixture.db, {
      orgId: 'org',
      workspaceId: WID,
      userId,
      now: 1,
      change:
        macAccess === undefined ? { preapprovedSecretIds: [] } : { macAccess },
    })
    return fixture.db
      .prepare(
        'SELECT mac_access AS access, mac_access_period AS period FROM workspaces WHERE id = ?',
      )
      .bind(WID)
      .first()
  }
  expect(await change(false)).toEqual({ access: 0, period: 1 })
  expect(await change(false)).toEqual({ access: 0, period: 2 })
  expect(await change()).toEqual({ access: 0, period: 2 })
  expect(await change(true)).toEqual({ access: 1, period: 2 })
  expect(await change(false, 'outsider')).toEqual({ access: 1, period: 2 })
  const mac = await connected(fixture)
  const first = await fixture.machine(fixture.input())
  expect(first.status).toBe(202)
  expect(await mac.inbox.next()).toMatchObject({
    type: 'command.request',
    macAccessPeriod: 2,
  })
  await change(false)
  await change(true)
  const nextMac = await connected(fixture)
  const next = await fixture.machine(fixture.input('after-reconnect'))
  expect(next.status).toBe(202)
  expect(await nextMac.inbox.next()).toMatchObject({
    type: 'command.request',
    macAccessPeriod: 3,
  })
  expect(await next.json()).toMatchObject({
    request: { requestId: 'after-reconnect' },
  })
})
