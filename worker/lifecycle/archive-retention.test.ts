import { expect, it } from 'vitest'

import { requireFeatureResult } from '../features/result'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { archiveFixture } from './archive-test-support'
import { repairLifecycleAlarms } from './repair'
import { SOFTWARE } from './backend-test-support'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import { providerForAccount } from '../sandbox/client'
import { record } from '../chat/inputs'
import { readWorkspace } from './workspace-data'
import { computerRecords } from './computer-ledger.test-support'

const fixtureForTest = setupBackendTests()
const day = 86_400_000

it('bridges an old archived disk without secrets or startup and rearms a restored closed workspace', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + day)
  await saved.archive()
  const commands = fixture.boat.commands.length
  await fixture.advanceTo(TEST_TIME + 13 * day, saved.id)
  expect(fixture.boat.resumeIds).toEqual([saved.sandboxId])
  const request = fixture.boat.server.requests.find((request) =>
    new URL(request.url).pathname.endsWith('/resume'),
  )
  if (!request) throw new Error('Missing archive maintenance resume')
  expect(record(await request.clone().json()).env).toEqual({})
  await saved.actor.restart()
  await fixture.advanceTo(TEST_TIME + 13 * day + 5_000, saved.id)
  expect(fixture.boat.commands).toHaveLength(commands)
  expect(fixture.boat.stopIds).toEqual([saved.sandboxId])
  const restored = requireFeatureResult(await saved.restore())
  expect(restored.workspace.state).toBe('stopped')
  expect(await saved.actor.storage.get('alarm:lifecycle')).toBe(
    TEST_TIME + 26 * day + 5_000,
  )
  await fixture.advanceTo(TEST_TIME + 26 * day + 5_000, saved.id)
  expect(fixture.boat.resumeIds).toEqual([saved.sandboxId, saved.sandboxId])
})

it('rechecks suspension after the provider read before an archived maintenance resume', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + day)
  await saved.archive()
  fixture.boat.beforeSandboxRead = async () => {
    fixture.boat.beforeSandboxRead = undefined
    await fixture.runtime.env.DB.prepare(
      'UPDATE users SET suspended_at = ? WHERE id = ?',
    )
      .bind(TEST_TIME, fixture.user.id)
      .run()
  }
  await fixture.advanceTo(TEST_TIME + 13 * day, saved.id)
  expect(fixture.boat.resumeIds).toEqual([])
})

it('repairs lost archived bridge and deletion alarms before their disk deadlines', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + day)
  const archived = await saved.archive()
  if (archived.workspace.restoreUntil === null)
    throw new Error('Missing Restore deadline')
  await saved.actor.storage.deleteAlarm()
  await saved.actor.storage.delete('alarm:lifecycle:archive')
  await fixture.runtime.env.DB.prepare(
    'UPDATE org_images SET next_image_refresh_at = NULL',
  ).run()
  await fixture.setTime(TEST_TIME + 13 * day + 900_000)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 1, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
  await fixture.advanceTo(fixture.runtime.dependencies.now(), saved.id)
  expect(fixture.boat.resumeIds).toEqual([saved.sandboxId])
  await fixture.advanceTo(fixture.runtime.dependencies.now() + 5_000, saved.id)
  await saved.actor.storage.deleteAlarm()
  await saved.actor.storage.delete('alarm:lifecycle:archive')
  await fixture.setTime(archived.workspace.restoreUntil + 900_000)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 1, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
  await fixture.advanceTo(fixture.runtime.dependencies.now(), saved.id)
  expect(fixture.boat.deletedIds).toEqual([saved.sandboxId])
})

it('stops, bridges, and purges an equal-ID disk only through its saved provider account', async () => {
  const fixture = fixtureForTest()
  const second = new LifecycleBoat()
  second.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  fixture.runtime.env.SANDBOX_PROVIDER_ACCOUNTS = {
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  }
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = (request) =>
    request.headers.get('X-Boat-Org') === 'second-org'
      ? second.fetch(request)
      : fetch(request)
  const saved = await archiveFixture(fixture, true)
  const disk = await providerForAccount(
    fixture.runtime.env,
    fixture.runtime.dependencies.fetch,
    'boat-second',
  ).create({ env: {}, ttlSeconds: 1800, idempotencyKey: 'second-disk' })
  expect(disk.id).toBe(saved.sandboxId)
  await fixture.runtime.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'boat-second' WHERE id = ?",
  )
    .bind(saved.id)
    .run()
  second.states.set(disk.id, 'archived')
  const primaryRequests = fixture.boat.server.requests.length
  await fixture.setTime(TEST_TIME + day)
  const archived = await saved.archive()
  await fixture.advanceTo(TEST_TIME + 13 * day, saved.id)
  await fixture.advanceTo(TEST_TIME + 13 * day + 5_000, saved.id)
  if (archived.workspace.restoreUntil === null)
    throw new Error('Missing secondary deadline')
  await saved.actor.native.configure({
    environment: { SANDBOX_PROVIDER_ACCOUNTS: {} },
  })
  await fixture.advanceTo(archived.workspace.restoreUntil, saved.id)
  expect(second.deletedIds).toEqual([])
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      sandboxId: disk.id,
      providerAccount: 'boat',
      deletedAt: null,
      cleanupPending: 0,
    },
    {
      sandboxId: disk.id,
      providerAccount: 'boat-second',
      deletedAt: null,
      cleanupPending: 1,
    },
  ])
  expect(
    await readWorkspace(fixture.runtime.env.DB, fixture.org.id, saved.id),
  ).toMatchObject({ sandboxId: disk.id, providerAccount: 'boat-second' })
  await saved.actor.native.configure({
    environment: {
      SANDBOX_PROVIDER_ACCOUNTS: fixture.runtime.env.SANDBOX_PROVIDER_ACCOUNTS,
    },
  })
  await fixture.advanceTo(archived.workspace.restoreUntil + 30_000, saved.id)
  expect(second.resumeIds).toEqual([disk.id])
  expect(second.stopIds).toEqual([disk.id])
  expect(second.deletedIds).toEqual([disk.id])
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    {
      sandboxId: disk.id,
      providerAccount: 'boat',
      deletedAt: null,
      cleanupPending: 0,
    },
    {
      sandboxId: disk.id,
      providerAccount: 'boat-second',
      deletedAt: archived.workspace.restoreUntil + 30_000,
      cleanupPending: 0,
    },
  ])
  expect(fixture.boat.server.requests).toHaveLength(primaryRequests)
  expect(fixture.boat.states.has(saved.sandboxId)).toBe(true)
  expect(
    new Set(
      second.server.requests.map((request) =>
        request.headers.get('X-Boat-Org'),
      ),
    ),
  ).toEqual(new Set(['second-org']))
})
