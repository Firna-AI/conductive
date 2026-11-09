import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture } from './deletion-test-support'
import type { RestoreOrgMaintenance } from './maintenance-contract'
import { lifecycleFixture } from './maintenance-test-support'
import { write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('keeps the org deleted when a failed Restore handoff is retried after its admin is suspended', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  Object.assign(client.hooks, {
    restoreOrgMaintenance: async () => {
      throw new Error('Timer handoff failed')
    },
  })
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(502)
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, admin.user.id)
    .run()
  Object.assign(client.hooks, {
    restoreOrgMaintenance: lifecycle.restoreOrgMaintenance,
  })
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
  expect(lifecycle.restored).toEqual([])
  expect(
    await harness.env.DB.prepare(
      'SELECT deleted_at AS deletedAt FROM orgs WHERE id = ?',
    )
      .bind(org.id)
      .first(),
  ).toEqual({ deletedAt: TEST_TIME })
  expect(
    await harness.env.DB.prepare(
      'SELECT restore_request_id AS requestId FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first(),
  ).toEqual({ requestId: null })
})

it('refuses activation when the Restore admin is suspended during the maintenance handoff', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  Object.assign(client.hooks, {
    restoreOrgMaintenance: async (input: RestoreOrgMaintenance) => {
      await lifecycle.restoreOrgMaintenance(input)
      await harness.env.DB.prepare(
        'UPDATE users SET suspended_at = ? WHERE id = ?',
      )
        .bind(TEST_TIME, admin.user.id)
        .run()
    },
  })
  const response = await client.request(
    restoreOrgPath(org.id),
    admin.session,
    write({}),
  )
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'org_restore_expired' },
  })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
  expect(
    await harness.env.DB.prepare(
      'SELECT deleted_at AS deletedAt FROM orgs WHERE id = ?',
    )
      .bind(org.id)
      .first(),
  ).toEqual({ deletedAt: TEST_TIME })
})
