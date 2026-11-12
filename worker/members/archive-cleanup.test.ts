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
import {
  ARCHIVE_STATE_KEY,
  type WorkspaceArchiveState,
} from '../lifecycle/archive-types'
import { boatRoute } from '../sandbox/routes'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { archiveCleanupFixture } from './archive-cleanup.test-support'
import { providerRequests } from './deletion-test-support'
import { DAY_MS, readDisk } from './maintenance-test-support'
import { write } from './members-test-support'
import { LIFECYCLE_FENCE_KEY } from './receiver-fence'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.boat.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  })
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await harness.dispose()
})

it('continues expired deletes and disk retention after an Archive Delete fails, then recovers without dispatch after lease loss', async () => {
  const fixture = await archiveCleanupFixture(harness)
  const { org, client } = fixture
  const expiresAt = TEST_TIME + DAY_MS / 2
  const failed = await fixture.seedArchive('expired-first', expiresAt)
  const healthy = await fixture.seedArchive('expired-second', expiresAt)
  const later = await fixture.seedArchive(
    'expired-third',
    TEST_TIME + 3 * DAY_MS,
  )
  expect((await fixture.deleteOrg()).status).toBe(200)
  const route = boatRoute({ operation: 'delete', sandboxId: failed.sandboxId })
  const fetch = client.dependencies.fetch
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  let refuseDelete = true
  let loseLease = false
  client.dependencies.fetch = async (request) => {
    if (
      refuseDelete &&
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    ) {
      if (loseLease) client.setTime(client.dependencies.now() + 300_000)
      harness.boat.responseFactories.unshift(() =>
        Response.json(
          { ok: false, code: 'unavailable', message: 'private-provider-body' },
          { status: 503 },
        ),
      )
    }
    return fetch(request)
  }
  await fixture.setTime(expiresAt)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  const healthyAfterFirstAttempt = await fixture.archiveRecord(
    healthy.workspaceId,
  )
  await fixture.setTime(TEST_TIME + 2 * DAY_MS)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(await readDisk(harness)).toEqual({
    stoppedAt: TEST_TIME + 2 * DAY_MS,
    nextKeepaliveAt: TEST_TIME + 15 * DAY_MS,
    state: 'stopped',
  })
  expect(healthyAfterFirstAttempt).toMatchObject({
    disk: { sandboxId: null },
    computer: { deletedAt: expiresAt },
    resource: { removedAt: expiresAt },
  })
  expect(providerRequests(harness)).toEqual([
    'DELETE /sandboxes/sandbox-expired-first',
    'POST /sandboxes/sandbox-workspace-one/resume',
    'POST /sandboxes/sandbox-workspace-one/stop',
  ])
  expect(await harness.boat.requests[1].json()).toEqual({
    noEnv: true,
    env: {},
    ttlSeconds: 1_800,
  })
  expect(await fixture.archiveRecord(failed.workspaceId)).toMatchObject({
    disk: { sandboxId: failed.sandboxId },
    computer: { deletedAt: null, providerAccount: 'boat' },
    resource: { removedAt: null },
  })
  expect(warn.mock.calls).toContainEqual([
    {
      kind: 'workspace_archive_failed',
      message: 'Workspace archive maintenance will retry.',
      workspaceId: 'unknown',
      phase: 'purge',
      error: {
        kind: 'provider',
        providerKind: 'unavailable',
        status: 503,
        code: null,
      },
    },
  ])
  expect(JSON.stringify(warn.mock.calls)).not.toContain('private-provider-body')
  await fixture.setTime(TEST_TIME + 3 * DAY_MS)
  loseLease = true
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(providerRequests(harness)).toEqual([
    'DELETE /sandboxes/sandbox-expired-first',
  ])
  expect(await fixture.archiveRecord(later.workspaceId)).toMatchObject({
    disk: { sandboxId: later.sandboxId },
    resource: { removedAt: null },
  })
  refuseDelete = false
  const recoveredAt = TEST_TIME + 3 * DAY_MS + 330_000
  await fixture.setTime(recoveredAt)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [] })
  expect(providerRequests(harness)).toEqual([
    'DELETE /sandboxes/sandbox-expired-first',
    'DELETE /sandboxes/sandbox-expired-third',
  ])
  expect(await fixture.archiveRecord(failed.workspaceId)).toMatchObject({
    disk: { sandboxId: null },
    computer: { deletedAt: recoveredAt },
    resource: { removedAt: recoveredAt },
  })
})

it('finishes a pending Org Restore handoff when an expired Archive account is missing and retention fails', async () => {
  const fixture = await archiveCleanupFixture(harness)
  const { org, admin, member, client, production } = fixture
  const failed = await fixture.seedArchive(
    'expired-archive',
    TEST_TIME + DAY_MS / 2,
    'boat-second',
  )
  expect((await fixture.deleteOrg()).status).toBe(200)
  const requests: string[] = []
  client.hooks.restoreOrgMaintenance = async (input) => {
    requests.push(input.requestId)
    throw new Error('Timer handoff interrupted')
  }
  expect(
    (await client.request(restoreOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(502)
  expect(requests).toHaveLength(1)
  harness.env.WORKSPACES = harness.native.bindings.WORKSPACES
  const archived = harness.native.actor(failed.workspaceId)
  await Promise.all([
    archived.ready,
    harness.native.actor('workspace-one').ready,
    harness.native.actor(`org-image:${org.id}`).ready,
  ])
  await archived.api.storage.put(ARCHIVE_STATE_KEY, {
    revision: 0,
    workspaceId: failed.workspaceId,
    orgId: org.id,
    archivedAt: failed.archivedAt,
    sandboxId: failed.sandboxId,
    providerAccount: failed.providerAccount,
    stoppedAt: TEST_TIME,
    phase: 'retained',
  } satisfies WorkspaceArchiveState)
  client.hooks.restoreOrgMaintenance = async (input) => {
    requests.push(input.requestId)
    await production.restoreOrgMaintenance(input)
  }
  const modes: string[] = []
  client.hooks.maintainDeletedOrg = async (input) => {
    modes.push(input.mode)
    if (input.mode === 'retention') throw new Error('Retention interrupted')
    await production.maintainDeletedOrg(input)
  }
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({})
  const retryAt = TEST_TIME + 2 * DAY_MS
  await fixture.setTime(retryAt)
  harness.boat.requests = []
  expect(await fixture.cleanup()).toEqual({ purged: [], pending: [org.id] })
  expect(requests).toEqual([requests[0], requests[0]])
  expect(modes).toEqual(['retention', 'restore'])
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    200,
  )
  expect(providerRequests(harness)).toEqual([])
  const snapshot = await archived.api.controls.snapshot()
  expect(snapshot.records.get('alarm:lifecycle:archive')).toBe(retryAt)
  const generation = await harness.env.DB.prepare(
    'SELECT lifecycle_generation FROM orgs WHERE id = ?',
  )
    .bind(org.id)
    .first<number>('lifecycle_generation')
  expect(snapshot.records.get(LIFECYCLE_FENCE_KEY)).toEqual({
    orgId: org.id,
    generation,
    mode: 'active',
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT org_id FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first(),
  ).toBeNull()
})
