import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { backendFixture } from '../lifecycle/backend-test-support'
import { readWorkspace } from '../lifecycle/workspace-data'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { liftUserSuspension } from './lift'
import { suspendUser } from './suspend-user'
import { existingWorkspace, joinedMember } from './suspension-test-support'

let harness: TestHarness
let fixture: Awaited<ReturnType<typeof backendFixture>>
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.env.DB.prepare('DELETE FROM suspension_events').run()
  await harness.reset()
  fixture = await backendFixture(harness)
})
afterEach(async () => fixture.dispose())
afterAll(async () => harness.dispose())

it('reports a failed workspace check and still restores the other workspace disk alarm', async () => {
  const operator = await joinedMember(fixture)
  await existingWorkspace(fixture, 'a-fails')
  await existingWorkspace(fixture, 'b-finishes')
  await suspendUser(fixture.runtime, fixture.user.githubId, operator.id)
  const stopped = await fixture.runtime.workspace('b-finishes').readLifecycle()
  if (!stopped) throw new Error('Missing stopped lifecycle')
  const checks: string[] = []
  const runtime = {
    ...fixture.runtime,
    workspace(id: string) {
      const endpoint = fixture.runtime.workspace(id)
      return {
        ...endpoint,
        async reconcileLifecycleAccess(workspaceId: string) {
          checks.push(workspaceId)
          if (workspaceId === 'a-fails') throw new Error('Workspace RPC failed')
          await endpoint.reconcileLifecycleAccess(workspaceId)
        },
      }
    },
  }
  const lifted = await liftUserSuspension(
    runtime,
    fixture.user.githubId,
    operator.id,
  )
  expect(lifted).toEqual({
    userId: fixture.user.id,
    liftedAt: TEST_TIME,
    pendingWorkspaceIds: ['a-fails'],
  })
  expect(checks).toEqual(['a-fails', 'b-finishes'])
  expect(await fixture.actors.get('a-fails')?.storage.getAlarm()).toBeNull()
  expect(await fixture.actors.get('b-finishes')?.storage.getAlarm()).toBe(
    stopped.nextDiskKeepaliveAt,
  )
  expect(stopped.nextDiskKeepaliveAt).not.toBeNull()
  expect(
    await liftUserSuspension(runtime, fixture.user.githubId, operator.id),
  ).toEqual({
    userId: fixture.user.id,
    liftedAt: null,
    pendingWorkspaceIds: [],
  })
  expect(checks).toEqual(['a-fails', 'b-finishes'])
})

it('keeps an overdue disk deadline and runs its restart after the user is lifted', async () => {
  const operator = await joinedMember(fixture)
  await existingWorkspace(fixture, 'overdue')
  const { sandboxId } = await readWorkspace(
    fixture.runtime.env.DB,
    fixture.org.id,
    'overdue',
  )
  const actor = fixture.runtime.workspace('overdue')
  await suspendUser(fixture.runtime, fixture.user.githubId, operator.id)
  const stopped = await actor.readLifecycle()
  if (!stopped || stopped.nextDiskKeepaliveAt === null)
    throw new Error('Missing stopped disk deadline')
  const nextKeepaliveAt = stopped.nextDiskKeepaliveAt
  await fixture.setTime(nextKeepaliveAt + 1)
  await actor.reconcileLifecycleAccess('overdue')
  expect(await fixture.actors.get('overdue')?.storage.getAlarm()).toBeNull()
  expect((await actor.readLifecycle())?.nextDiskKeepaliveAt).toBe(
    nextKeepaliveAt,
  )
  expect(
    await liftUserSuspension(
      fixture.runtime,
      fixture.user.githubId,
      operator.id,
    ),
  ).toEqual({
    userId: fixture.user.id,
    liftedAt: nextKeepaliveAt + 1,
    pendingWorkspaceIds: [],
  })
  expect(await fixture.actors.get('overdue')?.storage.getAlarm()).toBe(
    nextKeepaliveAt,
  )
  await fixture.advanceTo(nextKeepaliveAt + 1, 'overdue')
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
})
