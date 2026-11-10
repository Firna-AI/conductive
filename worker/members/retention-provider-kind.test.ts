import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { deleteOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { withCleanupLease } from './cleanup-lease'
import { deletionFixture } from './deletion-test-support'
import { maintainDeletedOrg } from './maintenance'
import { lifecycleFixture, stopWorkspace } from './maintenance-test-support'
import { write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('keeps a deleted E2B disk out of retention without blocking maintenance', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await stopWorkspace(harness, 'workspace-one', 13)
  const deleted = await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  expect(deleted.status).toBe(200)
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    e2b: {
      kind: 'e2b',
      apiKey: 'e2b-test-key',
      domain: 'eu.e2b.dev',
      templateId: 'test-template',
    },
  })
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'UPDATE workspaces SET provider_account = ? WHERE id = ?',
    ).bind('e2b', 'workspace-one'),
    harness.env.DB.prepare(
      "UPDATE org_deletion_resources SET provider_account = ? WHERE org_id = ? AND resource_id = ? AND kind = 'sandbox'",
    ).bind('e2b', org.id, 'sandbox-workspace-one'),
  ])
  client.setTime(TEST_TIME + 23 * 3_600_000)
  const fetch = vi.fn(async () => Response.json({}, { status: 503 }))
  const dependencies = { ...client.dependencies, fetch }
  await expect(
    withCleanupLease(harness.env, org.id, dependencies, (token) =>
      maintainDeletedOrg(
        harness.env,
        org.id,
        token,
        dependencies,
        client.hooks,
      ),
    ),
  ).resolves.toBeUndefined()
  expect(lifecycle.maintenance.at(-1)?.workspaces).toEqual([])
  expect(fetch.mock.calls).toEqual([])
})
