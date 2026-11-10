import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { deleteOrgPath } from '../../src/shared/orgs'
import { userSuspensionPath } from '../../src/shared/operator'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture, providerRequests } from './deletion-test-support'
import type { DeletedOrgMaintenance } from './maintenance-contract'
import {
  lifecycleFixture,
  readDisk,
  stopWorkspace,
  DAY_MS,
  TEST_RETENTION_INTERVAL_MS,
} from './maintenance-test-support'
import { seedWorkspace, write } from './members-test-support'

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

it('preserves existing stop dates and schedules genuine stops without an early retention restart', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await stopWorkspace(harness, 'workspace-one', 13)
  await seedWorkspace(harness, org, member.user, 'eight-day-disk')
  await stopWorkspace(harness, 'eight-day-disk', 8)
  await seedWorkspace(harness, org, member.user, 'new-stop')
  await seedWorkspace(harness, org, member.user, 'archived-disk')
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'archived', archived_at = ? WHERE id = 'archived-disk'",
  )
    .bind(TEST_TIME)
    .run()
  const response = await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  expect(response.status).toBe(200)
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME - 13 * DAY_MS,
    nextKeepaliveAt: TEST_TIME + 23 * 3600000,
    state: 'stopped',
  })
  expect(await readDisk(harness, 'eight-day-disk')).toEqual({
    stoppedAt: TEST_TIME - 8 * DAY_MS,
    nextKeepaliveAt: TEST_TIME + 5 * DAY_MS + 23 * 3600000,
    state: 'stopped',
  })
  expect(await readDisk(harness, 'new-stop')).toEqual({
    stoppedAt: TEST_TIME,
    nextKeepaliveAt: TEST_TIME + TEST_RETENTION_INTERVAL_MS,
    state: 'stopped',
  })
  expect(
    lifecycle.maintenance.map((input) =>
      input.workspaces.map((disk) => disk.workspaceId),
    ),
  ).toEqual([['archived-disk', 'eight-day-disk', 'new-stop', 'workspace-one']])
  expect(
    providerRequests(harness).filter((call) => call.endsWith('/resume')),
  ).toEqual([])
})

it('performs only due retention under a temporary lease capability and retries failed maintenance', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await stopWorkspace(harness, 'workspace-one', 13)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  client.setTime(TEST_TIME + 23 * 3600000)
  let expiredRestartResult: unknown
  harness.boat.requests = []
  Object.assign(client.hooks, {
    maintainDeletedOrg: async (input: DeletedOrgMaintenance) => {
      client.setTime(input.now + 300000)
      try {
        expiredRestartResult = await input.retention.restart(
          'workspace-one',
          60,
        )
      } catch (error) {
        expiredRestartResult = error
      }
      throw new Error('Retention interrupted')
    },
  })
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(expiredRestartResult).toMatchObject({ code: 'org_cleanup_busy' })
  expect(providerRequests(harness)).toEqual([])
  Object.assign(client.hooks, {
    maintainDeletedOrg: lifecycle.maintainDeletedOrg,
  })
  harness.boat.failure = { status: 403, code: 'api_key_action_forbidden' }
  const refused = await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  expect(refused.status).toBe(502)
  expect(await refused.json()).toEqual({
    error: {
      code: 'org_cleanup_failed',
      message: 'The org cleanup could not finish. Try again.',
    },
  })
  harness.boat.failure = null
  harness.boat.requests = []
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(providerRequests(harness)).toEqual([
    'POST /sandboxes/sandbox-workspace-one/stop',
    'POST /sandboxes/sandbox-workspace-one/resume',
    'POST /sandboxes/sandbox-workspace-one/stop',
  ])
  expect(await harness.boat.requests[1].json()).toEqual({
    noEnv: true,
    env: {},
    ttlSeconds: 60,
  })
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME + 23 * 3600000 + 300000,
    nextKeepaliveAt:
      TEST_TIME + 23 * 3600000 + 300000 + TEST_RETENTION_INTERVAL_MS,
    state: 'stopped',
  })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
  expect(
    await harness.env.DB.prepare(
      'SELECT revoked_at FROM preview_hostnames WHERE org_id = ?',
    )
      .bind(org.id)
      .first('revoked_at'),
  ).toBe(TEST_TIME)
  const capability =
    lifecycle.maintenance[lifecycle.maintenance.length - 1].retention
  await expect(capability.restart('workspace-one', 60)).rejects.toMatchObject({
    code: 'org_cleanup_busy',
  })
  expect(providerRequests(harness)).toHaveLength(3)
})

it('skips a suspended owner during deleted-org disk retention', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  lifecycleFixture(client)
  await stopWorkspace(harness, 'workspace-one', 13)
  const deleted = await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  expect(deleted.status).toBe(200)
  harness.env.OPERATOR_GITHUB_IDS = String(admin.user.githubId)
  const suspended = await harness.request(
    userSuspensionPath(member.user.githubId),
    admin.session,
    write({}),
  )
  expect(suspended.status).toBe(202)
  client.setTime(TEST_TIME + 23 * 3600000)
  harness.boat.requests = []
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [] })
  expect(providerRequests(harness)).toEqual([])
})
