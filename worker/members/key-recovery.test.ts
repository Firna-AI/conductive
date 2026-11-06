import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { boatKeyPath } from '../../src/shared/api'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import { readBoatKey } from '../data/boat-keys'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture } from './deletion-test-support'
import {
  keyRequest,
  lifecycleFixture,
  DAY_MS,
} from './maintenance-test-support'
import { signIn, write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.boat.accounts.set('boat-first', { id: 'team-one', type: 'org' })
})
afterAll(async () => {
  await harness.dispose()
})

it('lets a deleted-org admin replace an expired key through the core store and recover Restore', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  lifecycleFixture(client)
  const keyPath = boatKeyPath(org.id)
  expect(
    (await keyRequest(harness, client, keyPath, member.session)).status,
  ).toBe(200)
  harness.boat.accounts.delete('boat-first')
  const failed = await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  expect(failed.status).toBe(409)
  expect(await failed.json()).toEqual({
    error: {
      code: 'boat_key_required',
      message: 'Replace the cloud computer key to continue.',
    },
  })
  expect(
    (await keyRequest(harness, client, keyPath, member.session)).status,
  ).toBe(404)
  expect(
    (
      await keyRequest(
        harness,
        client,
        keyPath,
        member.session,
        write({ key: 'boat-rotated' }, 'PUT'),
      )
    ).status,
  ).toBe(404)
  expect(
    (await keyRequest(harness, client, keyPath, admin.session)).status,
  ).toBe(200)
  const stored = await readBoatKey(harness.env.DB, org.id)
  expect(
    (
      await keyRequest(
        harness,
        client,
        keyPath,
        admin.session,
        write({ key: 'boat-first' }, 'PUT'),
      )
    ).status,
  ).toBe(400)
  expect(
    (
      await keyRequest(
        harness,
        client,
        keyPath,
        admin.session,
        write({ key: 'boat-other' }, 'PUT'),
      )
    ).status,
  ).toBe(409)
  expect(await readBoatKey(harness.env.DB, org.id)).toEqual(stored)
  const saved = await keyRequest(
    harness,
    client,
    keyPath,
    admin.session,
    write({ key: 'boat-rotated' }, 'PUT'),
  )
  expect(await saved.json()).toEqual({ configured: true, updatedAt: TEST_TIME })
  expect((await readBoatKey(harness.env.DB, org.id))?.ciphertext).not.toContain(
    'boat-rotated',
  )
  expect(
    (
      await client.request(
        orgSettingsPaths.settings(org.id),
        admin.session,
        write({}, 'PATCH'),
      )
    ).status,
  ).toBe(404)
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(200)
})

it('accepts same-account key repair after expiry blocks a due purge', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  lifecycleFixture(client)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  harness.boat.accounts.delete('boat-first')
  client.setTime(TEST_TIME + 7 * DAY_MS)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  const renewedAdmin = await signIn(harness, 10, 'admin')
  const repaired = await keyRequest(
    harness,
    client,
    boatKeyPath(org.id),
    renewedAdmin.session,
    write({ key: 'boat-rotated' }, 'PUT'),
  )
  expect(repaired.status).toBe(200)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [org.id], pending: [] })
  expect(
    await harness.env.DB.prepare('SELECT id FROM orgs WHERE id = ?')
      .bind(org.id)
      .first(),
  ).toBeNull()
})
