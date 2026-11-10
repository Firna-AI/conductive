import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { liftUserSuspension } from '../operator/lift'
import { suspendOrg } from '../operator/suspend-org'
import { suspendUser } from '../operator/suspend-user'
import {
  existingWorkspace,
  joinedMember,
} from '../operator/suspension-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { backendFixture, SOFTWARE } from './backend-test-support'
import { repairLifecycleAlarms } from './repair'

let harness: TestHarness
let fixture: Awaited<ReturnType<typeof backendFixture>>
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await backendFixture(harness)
  await harness.env.DB.prepare('UPDATE settings SET next_image_refresh_at = ?')
    .bind(TEST_TIME + 30 * 86_400_000)
    .run()
})
afterEach(async () => fixture.dispose())
afterAll(async () => harness.dispose())

it('repairs the missing disk alarm after a lifted workspace RPC fails and defers another repair', async () => {
  const operator = await joinedMember(fixture)
  await existingWorkspace(fixture, 'repair-workspace')
  await suspendUser(fixture.runtime, fixture.user.githubId, operator.id)
  const endpoint = fixture.runtime.workspace('repair-workspace')
  const stopped = await endpoint.readLifecycle()
  if (!stopped || stopped.nextDiskKeepaliveAt === null)
    throw new Error('Missing disk deadline')
  const failedRuntime = {
    ...fixture.runtime,
    workspace(id: string) {
      return {
        ...fixture.runtime.workspace(id),
        async reconcileLifecycleAccess() {
          throw new Error('Workspace RPC failed')
        },
      }
    },
  }
  expect(
    await liftUserSuspension(failedRuntime, fixture.user.githubId, operator.id),
  ).toMatchObject({ pendingWorkspaceIds: ['repair-workspace'] })
  expect(
    await fixture.actors.get('repair-workspace')?.storage.getAlarm(),
  ).toBeNull()
  expect(
    await harness.env.DB.prepare(
      'SELECT next_disk_keepalive_at FROM workspaces WHERE id = ?',
    )
      .bind('repair-workspace')
      .first('next_disk_keepalive_at'),
  ).toBe(stopped.nextDiskKeepaliveAt)
  const now = stopped.nextDiskKeepaliveAt + 15 * 60 * 1_000
  await fixture.setTime(now - 1)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 0, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
  await fixture.setTime(now)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 1, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
  expect(await fixture.actors.get('repair-workspace')?.storage.getAlarm()).toBe(
    stopped.nextDiskKeepaliveAt,
  )
  expect(
    await harness.env.DB.prepare(
      'SELECT next_disk_keepalive_at FROM workspaces WHERE id = ?',
    )
      .bind('repair-workspace')
      .first('next_disk_keepalive_at'),
  ).toBe(now)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 0, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
})

it('keeps a lifted owner disk blocked while the org is still suspended', async () => {
  const operator = await joinedMember(fixture)
  await existingWorkspace(fixture, 'blocked-workspace')
  await suspendUser(fixture.runtime, fixture.user.githubId, operator.id)
  await suspendOrg(fixture.runtime, fixture.org.id, operator.id)
  await liftUserSuspension(fixture.runtime, fixture.user.githubId, operator.id)
  const state = await fixture.runtime
    .workspace('blocked-workspace')
    .readLifecycle()
  if (!state || state.nextDiskKeepaliveAt === null)
    throw new Error('Missing blocked deadline')
  await fixture.setTime(state.nextDiskKeepaliveAt + 15 * 60 * 1_000)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 0, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
  expect(
    await fixture.actors.get('blocked-workspace')?.storage.getAlarm(),
  ).toBeNull()
  expect(fixture.boat.resumeIds).toEqual([])
})
