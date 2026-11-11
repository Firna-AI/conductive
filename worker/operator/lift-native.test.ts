import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { activeRuntimeOwner } from '../lifecycle/ownership-maintenance-test-support'
import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { nativeSuspensionRuntime } from './native-runtime.test-support'
import { runningRuntimeWorkspace } from '../lifecycle/runtime-lifecycle-test-support'
import {
  authenticateWorkspaceToken,
  readWorkspaceToken,
} from '../lifecycle/tokens'
import { liftOrgSuspension, liftUserSuspension } from './lift'
import { suspendOrg } from './suspend-org'
import { suspendUser } from './suspend-user'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => fixture.dispose())

it('restores a native disk alarm after a user lift and restart while preserving its revoked token', async () => {
  const { actor, workspaceId } = await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  const runtime = nativeSuspensionRuntime(fixture)
  const token = await readWorkspaceToken(fixture.env, workspaceId)
  await suspendUser(runtime, 11, 'active-admin')
  const stopped = await actor.readLifecycle()
  if (!stopped) throw new Error('Missing stopped lifecycle')
  const nextKeepaliveAt = stopped.nextDiskKeepaliveAt
  expect(stopped.state).toBe('stopped')
  expect(stopped.nextDiskKeepaliveAt).not.toBeNull()
  expect(await actor.alarmAt()).toBeNull()
  expect(await liftUserSuspension(runtime, 11, 'active-admin')).toMatchObject({
    userId: 'runtime-user',
    pendingWorkspaceIds: [],
  })
  expect(await actor.alarmAt()).toBe(stopped.nextDiskKeepaliveAt)
  expect(await actor.readLifecycle()).toEqual(stopped)
  await expect(
    authenticateWorkspaceToken(fixture.env, token),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })
  expect(fixture.boat.resumeIds).toEqual([])
  await fixture.restart()
  const restored = fixture.actor(workspaceId)
  expect(await restored.alarmAt()).toBe(nextKeepaliveAt)
})

it('keeps native disk maintenance blocked until both the org and the owner are lifted', async () => {
  const { actor } = await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  const runtime = nativeSuspensionRuntime(fixture)
  await suspendOrg(runtime, 'runtime-org', 'active-admin')
  await suspendUser(runtime, 11, 'active-admin')
  expect(
    await liftOrgSuspension(runtime, 'runtime-org', 'active-admin'),
  ).toMatchObject({ orgId: 'runtime-org', pendingWorkspaceIds: [] })
  expect(await actor.alarmAt()).toBeNull()
  await suspendOrg(runtime, 'runtime-org', 'active-admin')
  await liftUserSuspension(runtime, 11, 'active-admin')
  expect(await actor.alarmAt()).toBeNull()
  const blocked = await actor.readLifecycle()
  if (!blocked) throw new Error('Missing blocked lifecycle')
  expect(blocked.nextDiskKeepaliveAt).not.toBeNull()
  expect(
    await liftOrgSuspension(runtime, 'runtime-org', 'active-admin'),
  ).toMatchObject({ orgId: 'runtime-org', pendingWorkspaceIds: [] })
  expect(await actor.alarmAt()).toBe(blocked.nextDiskKeepaliveAt)
  expect(fixture.boat.resumeIds).toEqual([])
})
