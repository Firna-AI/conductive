import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { orgPath } from '../../src/shared/api'
import { restoreOrgPath } from '../../src/shared/orgs'
import { boatRoute } from '../sandbox/routes'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { archiveCleanupFixture } from './archive-cleanup.test-support'
import { cleanupResources } from './deletion-data'
import { providerRequests } from './deletion-test-support'
import { DAY_MS, readDisk } from './maintenance-test-support'
import { seedWorkspace, write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await harness.dispose()
})

it('retains another disk after persistent stop failure, requires suspension, and keeps purge blocked', async () => {
  const fixture = await archiveCleanupFixture(harness)
  const { org, member, client } = fixture
  await seedWorkspace(harness, org, member.user, 'failed-stop')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const suspend = client.hooks.suspendOrg
  client.hooks.suspendOrg = async () => {
    throw new Error('private-suspension-failure')
  }
  expect((await fixture.deleteOrg()).status).toBe(502)
  await fixture.setTime(TEST_TIME + 2 * DAY_MS)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(providerRequests(harness)).toEqual([])
  expect(await cleanupResources(harness.env.DB, org.id)).toEqual([])
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME - 12 * DAY_MS,
    nextKeepaliveAt: TEST_TIME + DAY_MS,
    state: 'stopped',
  })
  client.hooks.suspendOrg = suspend
  const route = boatRoute({
    operation: 'stop',
    sandboxId: 'sandbox-failed-stop',
  })
  const fetch = client.dependencies.fetch
  client.dependencies.fetch = async (request) => {
    if (
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    ) {
      harness.boat.responseFactories.unshift(() =>
        Response.json(
          { ok: false, code: 'unavailable', message: 'private-provider-body' },
          { status: 503 },
        ),
      )
    }
    return fetch(request)
  }
  expect((await fixture.deleteOrg()).status).toBe(502)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME + 2 * DAY_MS,
    nextKeepaliveAt: TEST_TIME + 15 * DAY_MS,
    state: 'stopped',
  })
  expect(providerRequests(harness)).toEqual([
    'POST /sandboxes/sandbox-failed-stop/stop',
    'POST /sandboxes/sandbox-workspace-one/resume',
    'POST /sandboxes/sandbox-workspace-one/stop',
  ])
  expect(await cleanupResources(harness.env.DB, org.id)).toEqual([
    {
      kind: 'sandbox',
      id: 'sandbox-failed-stop',
      providerAccount: 'boat',
      stoppedAt: null,
      removedAt: null,
    },
    {
      kind: 'sandbox',
      id: 'sandbox-workspace-one',
      providerAccount: 'boat',
      stoppedAt: TEST_TIME + 2 * DAY_MS,
      removedAt: null,
    },
  ])
  await fixture.setTime(TEST_TIME + 7 * DAY_MS)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(providerRequests(harness)).toEqual([
    'POST /sandboxes/sandbox-failed-stop/stop',
  ])
  expect(client.removedWorkspaceState).toEqual([])
  expect(
    await harness.env.DB.prepare(
      'SELECT purge_started_at AS purgeStartedAt FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first(),
  ).toEqual({ purgeStartedAt: null })
  const pendingWarning = {
    kind: 'org_cleanup_failed',
    message: 'Deleted-org cleanup will retry.',
  }
  const stopWarning = {
    kind: 'org_cleanup_stop_failed',
    message: 'Deleted-org computer stops will retry.',
  }
  expect(warn.mock.calls).toEqual([
    [pendingWarning],
    [stopWarning],
    [pendingWarning],
    [stopWarning],
    [pendingWarning],
  ])
})

it('retains a due disk and completes a pending Restore after an expired Archive delete fails', async () => {
  const fixture = await archiveCleanupFixture(harness)
  const { org, admin, member, client } = fixture
  const failed = await fixture.seedArchive(
    'expired-archive',
    TEST_TIME + DAY_MS,
  )
  expect((await fixture.deleteOrg()).status).toBe(200)
  const requests: string[] = []
  client.hooks.restoreOrgMaintenance = async (input) => {
    requests.push(input.requestId)
    throw new Error('private-handoff-failure')
  }
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(502)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const route = boatRoute({ operation: 'delete', sandboxId: failed.sandboxId })
  const fetch = client.dependencies.fetch
  client.dependencies.fetch = async (request) => {
    if (
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    ) {
      harness.boat.responseFactories.unshift(() =>
        Response.json(
          { ok: false, code: 'unavailable', message: 'private-provider-body' },
          { status: 503 },
        ),
      )
    }
    return fetch(request)
  }
  client.hooks.restoreOrgMaintenance = async (input) => {
    requests.push(input.requestId)
  }
  await fixture.setTime(TEST_TIME + 2 * DAY_MS)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME + 2 * DAY_MS,
    nextKeepaliveAt: TEST_TIME + 15 * DAY_MS,
    state: 'stopped',
  })
  expect(providerRequests(harness)).toEqual([
    'DELETE /sandboxes/sandbox-expired-archive',
    'POST /sandboxes/sandbox-workspace-one/resume',
    'POST /sandboxes/sandbox-workspace-one/stop',
  ])
  expect(requests).toEqual([requests[0], requests[0]])
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    200,
  )
  expect(
    await harness.env.DB.prepare(
      'SELECT org_id FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first(),
  ).toBeNull()
  expect(warn.mock.calls).toContainEqual([
    {
      kind: 'org_cleanup_archive_failed',
      message: 'Deleted-org Archive deletion will retry.',
    },
  ])
  expect(warn.mock.calls).toContainEqual([
    { kind: 'org_cleanup_failed', message: 'Deleted-org cleanup will retry.' },
  ])
  expect(JSON.stringify(warn.mock.calls)).not.toContain('private-')
})
