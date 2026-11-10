import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS, orgPath } from '../../src/shared/api'
import { membersPath } from '../../src/shared/members'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import { readOrgImage } from '../lifecycle/org-image-data'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { membersGate } from './gate'
import { deletionFixture, providerRequests } from './deletion-test-support'
import { memberFixture, membersClient, write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('hides a deleted org from members and restores stopped workspaces without a provider resume', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `UPDATE org_images SET last_refresh_at = 11, last_push_refresh_at = 21,
       pending_push_refresh_at = 31, next_image_refresh_at = 41
       WHERE org_id = ? AND provider_account = 'boat'`,
    ).bind(org.id),
    harness.env.DB.prepare(
      `INSERT INTO org_images (org_id, provider_account, image_name, last_refresh_at,
       last_push_refresh_at, pending_push_refresh_at, next_image_refresh_at)
       VALUES (?, 'boat-second', 'second-org-image', 12, 22, 32, 42)`,
    ).bind(org.id),
  ])
  const imageAccounts = ['boat', 'boat-second']
  const imagesBefore = await Promise.all(
    imageAccounts.map((account) =>
      readOrgImage(harness.env.DB, org.id, account),
    ),
  )
  const callsBeforeSuspension: number[] = []
  const suspendOrg = client.hooks.suspendOrg
  client.hooks.suspendOrg = async (orgId, workspaceIds, ownership) => {
    callsBeforeSuspension.push(harness.boat.requests.length)
    await suspendOrg(orgId, workspaceIds, ownership)
  }
  const path = deleteOrgPath(org.id)
  expect(
    (await client.request(path, member.session, write({ name: org.name })))
      .status,
  ).toBe(403)
  expect(
    (await client.request(path, admin.session, write({ name: 'Wrong' })))
      .status,
  ).toBe(400)
  const deleted = await client.request(
    path,
    admin.session,
    write({ name: org.name }),
  )
  expect(deleted.status).toBe(200)
  expect(await deleted.json()).toEqual({
    org: {
      ...org,
      deletion: { deletedAt: TEST_TIME, deletesAt: TEST_TIME + 604800000 },
    },
  })
  expect(providerRequests(harness)).toEqual([
    'POST /sandboxes/sandbox-workspace-one/stop',
    'POST /sandboxes/build-sandbox/stop',
  ])
  expect(client.suspendedOrgs).toEqual([
    { orgId: org.id, workspaceIds: ['workspace-one'] },
  ])
  expect(callsBeforeSuspension).toEqual([0])
  expect(
    await harness.env.DB.prepare(
      'SELECT revoked_at FROM preview_hostnames WHERE org_id = ?',
    )
      .bind(org.id)
      .first('revoked_at'),
  ).toBe(TEST_TIME)
  expect(
    await (await client.request(API_PATHS.orgs, member.session)).json(),
  ).toEqual({ orgs: [] })
  expect(
    await (await client.request(API_PATHS.orgs, admin.session)).json(),
  ).toEqual({
    orgs: [
      {
        ...org,
        deletion: { deletedAt: TEST_TIME, deletesAt: TEST_TIME + 604800000 },
      },
    ],
  })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
  expect(
    (await client.request(membersPath(org.id), admin.session)).status,
  ).toBe(404)
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
    (await client.request(restoreOrgPath(org.id), member.session, write({})))
      .status,
  ).toBe(404)
  expect(
    await (
      await client.request(restoreOrgPath(org.id), admin.session, write({}))
    ).json(),
  ).toEqual({ org })
  expect(
    await harness.env.DB.prepare(
      'SELECT state FROM workspaces WHERE org_id = ?',
    )
      .bind(org.id)
      .first('state'),
  ).toBe('stopped')
  expect(
    await Promise.all(
      imageAccounts.map((account) =>
        readOrgImage(harness.env.DB, org.id, account),
      ),
    ),
  ).toEqual(imagesBefore)
  expect(providerRequests(harness)).toHaveLength(2)
})

it('keeps deletion and preview revocation after a stop failure so the next cleanup can stop it', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  harness.boat.failure = { status: 503, code: 'unavailable' }
  const failed = await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  expect(failed.status).toBe(502)
  expect(await failed.json()).toEqual({
    error: {
      code: 'org_cleanup_failed',
      message: 'The org cleanup could not finish. Try again.',
    },
  })
  expect(providerRequests(harness)).toEqual([
    'POST /sandboxes/sandbox-workspace-one/stop',
    'POST /sandboxes/build-sandbox/stop',
  ])
  expect(
    await harness.env.DB.prepare('SELECT deleted_at FROM orgs WHERE id = ?')
      .bind(org.id)
      .first('deleted_at'),
  ).toBe(TEST_TIME)
  expect(
    await harness.env.DB.prepare(
      'SELECT revoked_at FROM preview_hostnames WHERE org_id = ?',
    )
      .bind(org.id)
      .first('revoked_at'),
  ).toBe(TEST_TIME)
  harness.boat.failure = null
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(
    await harness.env.DB.prepare(
      'SELECT state FROM workspaces WHERE org_id = ?',
    )
      .bind(org.id)
      .first('state'),
  ).toBe('stopped')
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(200)
})

it('runs the real sign-in Origin and JSON checks before deleted-org authorization', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  const url = `https://app.conductive.test${restoreOrgPath(org.id)}`
  await expect(
    membersGate(
      new Request(url, {
        method: 'POST',
        headers: {
          Origin: 'https://evil.test',
          Cookie: admin.session,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      harness.env,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 403, code: 'origin_forbidden' })
  await expect(
    membersGate(
      new Request(url, {
        method: 'POST',
        headers: {
          Origin: 'https://app.conductive.test',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      harness.env,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 401 })
  await expect(
    membersGate(
      new Request(url, {
        method: 'POST',
        headers: {
          Origin: 'https://app.conductive.test',
          Cookie: admin.session,
        },
        body: '{}',
      }),
      harness.env,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 415 })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
  const context = await membersGate(
    new Request(url, {
      method: 'POST',
      headers: {
        Origin: 'https://app.conductive.test',
        Cookie: admin.session,
        'Content-Type': 'application/json',
      },
      body: '{}',
    }),
    harness.env,
    TEST_TIME,
  )
  expect(context.org).toEqual({
    ...org,
    deletion: { deletedAt: TEST_TIME, deletesAt: TEST_TIME + 604800000 },
  })
})
