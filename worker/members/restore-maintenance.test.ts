import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture, providerRequests } from './deletion-test-support'
import type { RestoreOrgMaintenance } from './maintenance-contract'
import {
  lifecycleFixture,
  readDisk,
  stopWorkspace,
  DAY_MS,
} from './maintenance-test-support'
import { write } from './members-test-support'

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

it('retries a Restore maintenance handoff and lets a newer Delete cancel its intent', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await stopWorkspace(harness, 'workspace-one', 13)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  const failedHandoffs: string[] = []
  Object.assign(client.hooks, {
    restoreOrgMaintenance: async (input: RestoreOrgMaintenance) => {
      failedHandoffs.push(input.requestId)
      throw new Error('Timer handoff failed')
    },
  })
  const failed = await client.request(
    restoreOrgPath(org.id),
    admin.session,
    write({}),
  )
  expect(failed.status).toBe(502)
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(502)
  expect(failedHandoffs).toHaveLength(2)
  expect(failedHandoffs[1]).toBe(failedHandoffs[0])
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
  Object.assign(client.hooks, {
    restoreOrgMaintenance: lifecycle.restoreOrgMaintenance,
  })
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(lifecycle.restored).toEqual([])
  client.setTime(TEST_TIME + 23 * 3600000)
  harness.boat.requests = []
  Object.assign(client.hooks, {
    restoreOrgMaintenance: async () => {
      throw new Error('Timer handoff failed')
    },
  })
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(502)
  expect(providerRequests(harness)).toEqual([])
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(providerRequests(harness)).toEqual([
    'POST /sandboxes/sandbox-workspace-one/resume',
    'POST /sandboxes/sandbox-workspace-one/stop',
  ])
  let closedCallbackResult: unknown
  Object.assign(client.hooks, {
    restoreOrgMaintenance: async (input: RestoreOrgMaintenance) => {
      const callback = lifecycle.maintenance[lifecycle.maintenance.length - 1]
      try {
        closedCallbackResult = await callback.retention.schedule(
          'workspace-one',
          TEST_TIME + 23 * 3600000 + 14 * DAY_MS - 3600000,
        )
      } catch (error) {
        closedCallbackResult = error
      }
      await lifecycle.restoreOrgMaintenance(input)
    },
  })
  harness.boat.requests = []
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(closedCallbackResult).toMatchObject({ code: 'org_cleanup_busy' })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    200,
  )
  expect(lifecycle.restored).toMatchObject([
    {
      orgId: org.id,
      requestedByUserId: admin.user.id,
      requestedAt: TEST_TIME + 23 * 3600000,
      deletedAt: TEST_TIME,
      deletesAt: TEST_TIME + 7 * DAY_MS,
      workspaces: [
        {
          workspaceId: 'workspace-one',
          stoppedAt: TEST_TIME + 23 * 3600000,
          nextKeepaliveAt: TEST_TIME + 23 * 3600000 + 14 * DAY_MS - 3600000,
        },
      ],
    },
  ])
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME + 23 * 3600000,
    nextKeepaliveAt: TEST_TIME + 23 * 3600000 + 14 * DAY_MS - 3600000,
    state: 'stopped',
  })
  expect(providerRequests(harness)).toEqual([])
  expect(
    await harness.env.DB.prepare(
      'SELECT org_id FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first(),
  ).toBeNull()
})
