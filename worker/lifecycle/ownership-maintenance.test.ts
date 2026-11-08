import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { removeOrgMember } from '../members/membership'
import { reassignWorkspace } from '../members/ownership'
import { suspendUser } from '../operator/suspend-user'
import { workspaceOwnerChangedHook } from './ownership-maintenance'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { runningRuntimeWorkspace } from './runtime-lifecycle-test-support'
import { workspaceRuntime } from './runtime'
import { readWorkspace, workspaceView } from './workspace-data'
import { authenticateWorkspaceToken, readWorkspaceToken } from './tokens'
import { heldOperation } from './platform-test-storage'
import {
  activeRuntimeOwner,
  finishRuntimeStart,
  queueRuntimeResume,
  reassignRuntimeWorkspace,
  runtimeOwnershipHooks,
} from './ownership-maintenance-test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  await fixture.dispose()
})

it.each(['reassign', 'remove'] as const)(
  'rearms native stopped disk maintenance after an active admin takes ownership through %s',
  async (change) => {
    const { actor, workspaceId } = await runningRuntimeWorkspace(fixture)
    await suspendUser(workspaceRuntime(fixture.env), 11, 'runtime-user')
    const stopped = await actor.readLifecycle()
    if (!stopped) throw new Error('Missing stopped lifecycle')
    const nextKeepaliveAt = stopped.nextDiskKeepaliveAt
    expect(stopped.state).toBe('stopped')
    expect(await actor.alarmAt()).toBeNull()
    await activeRuntimeOwner(fixture)
    const runtime = workspaceRuntime(fixture.env)
    const hooks = {
      workspaceOwnerChanged: workspaceOwnerChangedHook(runtime),
      readWorkspace: async (orgId: string, id: string) =>
        workspaceView(await readWorkspace(fixture.env.DB, orgId, id)),
    }
    const requests = fixture.requests.length
    if (change === 'reassign') {
      await reassignWorkspace(
        fixture.env.DB,
        'runtime-org',
        'active-admin',
        workspaceId,
        'active-admin',
        Date.now(),
        hooks,
      )
    } else {
      await removeOrgMember(
        fixture.env.DB,
        'runtime-org',
        'active-admin',
        'runtime-user',
        Date.now(),
        hooks,
      )
    }
    expect(await actor.alarmAt()).toBe(stopped.nextDiskKeepaliveAt)
    expect(await actor.readLifecycle()).toEqual(stopped)
    expect(fixture.requests.slice(requests)).toEqual([])
    expect(fixture.boat.resumeIds).toEqual([])
    await fixture.restart()
    expect(await fixture.actor(workspaceId).alarmAt()).toBe(nextKeepaliveAt)
  },
)

it('retries a revoked-token stop after active ownership and preserves maintenance before a fresh resume', async () => {
  const { workspaceId, sandboxId } = await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  const oldToken = await readWorkspaceToken(fixture.env, workspaceId)
  fixture.boat.failStop = true
  const suspended = await suspendUser(
    workspaceRuntime(fixture.env),
    11,
    'active-admin',
  )
  expect(suspended.pendingWorkspaceIds).toEqual([workspaceId])
  await reassignRuntimeWorkspace(fixture, workspaceId)
  await fixture.restart()
  fixture.boat.failStop = false
  await fixture.actor(workspaceId).tick()
  expect(fixture.boat.states.get(sandboxId)).toBe('archived')
  expect(fixture.boat.stopIds).toEqual([sandboxId, sandboxId, sandboxId])
  expect(await fixture.actor(workspaceId).readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
    runningSessions: [],
  })
  const stopped = await fixture.actor(workspaceId).readLifecycle()
  if (!stopped) throw new Error('Missing stopped lifecycle')
  expect(await fixture.actor(workspaceId).alarmAt()).toBe(
    stopped.nextDiskKeepaliveAt,
  )
  expect(stopped.nextDiskKeepaliveAt).not.toBeNull()
  await queueRuntimeResume(fixture, workspaceId)
  expect(await finishRuntimeStart(fixture, workspaceId)).toEqual({ ok: true })
  const token = readWorkspaceToken(fixture.env, workspaceId)
  await expect(token).resolves.not.toBe(oldToken)
  await expect(
    authenticateWorkspaceToken(fixture.env, oldToken),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
})

it('orders a late suspended-owner stop before the new active owner restores the disk alarm', async () => {
  const { workspaceId, sandboxId } = await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  const stoppedReply = heldOperation()
  const ownerWritten = heldOperation()
  const fetch = fixture.boat.fetch
  let held = false
  fixture.boat.fetch = async (request) => {
    const response = await fetch(request)
    if (!held && new URL(request.url).pathname.endsWith(`/${sandboxId}/stop`)) {
      held = true
      await stoppedReply.wait()
    }
    return response
  }
  const suspending = suspendUser(
    workspaceRuntime(fixture.env),
    11,
    'active-admin',
  )
  await stoppedReply.entered
  const hooks = runtimeOwnershipHooks(fixture)
  const reconcile = hooks.workspaceOwnerChanged
  hooks.workspaceOwnerChanged = async (id) => {
    ownerWritten.release()
    await reconcile(id)
  }
  const reassigned = reassignWorkspace(
    fixture.env.DB,
    'runtime-org',
    'active-admin',
    workspaceId,
    'active-admin',
    Date.now(),
    hooks,
  )
  await ownerWritten.wait()
  stoppedReply.release()
  await Promise.all([suspending, reassigned])
  const state = await fixture.actor(workspaceId).readLifecycle()
  if (!state) throw new Error('Missing stopped lifecycle')
  expect(state.state).toBe('stopped')
  expect(state.nextDiskKeepaliveAt).not.toBeNull()
  expect(await fixture.actor(workspaceId).alarmAt()).toBe(
    state.nextDiskKeepaliveAt,
  )
  expect(fixture.boat.resumeIds).toEqual([])
})
