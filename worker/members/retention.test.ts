import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture, providerRequests } from './deletion-test-support'
import { seedWorkspace, signIn, write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
  await harness.env.DB.prepare('DROP TABLE boat_keys').run()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('purges snapshots before sandboxes and deletes durable workspace state only after seven days', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  const outsider = await signIn(harness, 30, 'outsider')
  const unrelated = await harness.createOrg(outsider.session, 'Unrelated')
  await seedWorkspace(harness, unrelated, outsider.user, 'unrelated-workspace')
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  harness.boat.requests = []
  client.setTime(TEST_TIME + 604799999)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(providerRequests(harness)).toEqual([])
  client.setTime(TEST_TIME + 604800000)
  const renewedAdmin = await signIn(harness, 10, 'admin')
  expect(
    (
      await client.request(
        restoreOrgPath(org.id),
        renewedAdmin.session,
        write({}),
      )
    ).status,
  ).toBe(409)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [org.id], pending: [] })
  expect(providerRequests(harness)).toEqual([
    'DELETE /saved-snapshots/build-image',
    'DELETE /saved-snapshots/org-image',
    'DELETE /sandboxes/sandbox-workspace-one',
    'DELETE /sandboxes/build-sandbox',
  ])
  expect(client.removedWorkspaceState).toEqual([`${org.id}/workspace-one`])
  expect(
    await harness.env.DB.prepare('SELECT id FROM orgs WHERE id = ?')
      .bind(org.id)
      .first(),
  ).toBeNull()
  expect(
    await harness.env.DB.prepare('SELECT id FROM workspaces').all(),
  ).toMatchObject({ results: [{ id: 'unrelated-workspace' }] })

  expect(
    harness.boat.requests.every(
      (request) =>
        request.headers.get('Authorization') === 'Bearer boat-first' &&
        request.headers.get('X-Boat-Org') === 'app-org',
    ),
  ).toBe(true)
})

it('retains provider ownership through snapshot sandbox and durable-state failures and resumes safely', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  client.setTime(TEST_TIME + 604800000)
  harness.boat.requests = []
  harness.boat.failure = { status: 503, code: 'unavailable' }
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(providerRequests(harness)).toEqual([
    'DELETE /saved-snapshots/build-image',
  ])
  expect(
    await harness.env.DB.prepare('SELECT id FROM workspaces WHERE org_id = ?')
      .bind(org.id)
      .first('id'),
  ).toBe('workspace-one')
  harness.boat.failure = null
  const fetch = client.dependencies.fetch
  client.dependencies.fetch = (request) =>
    request.method === 'DELETE' && request.url.includes('/sandboxes/')
      ? Promise.resolve(
          Response.json({ ok: false, code: 'unavailable' }, { status: 503 }),
        )
      : fetch(request)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  client.dependencies.fetch = fetch
  harness.boat.failure = { status: 404, code: 'not_found' }
  const removeState = client.hooks.deleteWorkspaceState
  client.hooks.deleteWorkspaceState = async () => {
    throw new Error('State store unavailable')
  }
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(
    await harness.env.DB.prepare('SELECT id FROM orgs WHERE id = ?')
      .bind(org.id)
      .first('id'),
  ).toBe(org.id)
  const completedProviderCalls = providerRequests(harness)
  client.hooks.deleteWorkspaceState = removeState
  harness.boat.failure = { status: 404, code: 'not_found' }
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [org.id], pending: [] })
  expect(client.removedWorkspaceState).toEqual([`${org.id}/workspace-one`])
  expect(providerRequests(harness)).toEqual(completedProviderCalls)
})
