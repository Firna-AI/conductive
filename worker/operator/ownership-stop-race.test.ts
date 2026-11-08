import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  activeRuntimeOwner,
  finishRuntimeStart,
  queueRuntimeResume,
  reassignRuntimeWorkspace,
} from '../lifecycle/ownership-maintenance-test-support'
import { workspaceOwnerChangedHook } from '../lifecycle/ownership-maintenance'
import {
  realRuntimeFixture,
  runtimeBundle,
} from '../lifecycle/real-runtime-test-support'
import { runningRuntimeWorkspace } from '../lifecycle/runtime-lifecycle-test-support'
import { workspaceRuntime } from '../lifecycle/runtime'
import { readWorkspaceToken } from '../lifecycle/tokens'
import { suspendUser } from './suspend-user'

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

it('keeps an operator stop pending when ownership changes before its native object call', async () => {
  const { workspaceId, sandboxId } = await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  fixture.boat.failStop = true
  const runtime = workspaceRuntime(fixture.env)
  const result = await suspendUser(
    {
      ...runtime,
      workspace: (id) => {
        const endpoint = runtime.workspace(id)
        return {
          ...endpoint,
          suspendLifecycle: async (workspaceId, ownerId) => {
            await reassignRuntimeWorkspace(fixture, workspaceId)
            return endpoint.suspendLifecycle(workspaceId, ownerId)
          },
        }
      },
    },
    11,
    'active-admin',
  )
  expect(result.pendingWorkspaceIds).toEqual([workspaceId])
  expect(fixture.boat.stopIds).toEqual([sandboxId, sandboxId])
  fixture.boat.failStop = false
  await fixture.actor(workspaceId).tick()
  expect(fixture.boat.states.get(sandboxId)).toBe('archived')
  const state = await fixture.actor(workspaceId).readLifecycle()
  if (!state) throw new Error('Missing stopped lifecycle')
  expect(state.state).toBe('stopped')
  expect(state.runningSessions).toEqual([])
  expect(state.nextDiskKeepaliveAt).not.toBeNull()
  expect(await fixture.actor(workspaceId).alarmAt()).toBe(
    state.nextDiskKeepaliveAt,
  )
})

it('leaves eligible pending starts intact and reports a skipped access stop as incomplete', async () => {
  const { actor, workspaceId, sandboxId } =
    await runningRuntimeWorkspace(fixture)
  await activeRuntimeOwner(fixture)
  expect(await actor.suspendLifecycle(workspaceId, 'runtime-user')).toBe(false)
  const oldToken = await readWorkspaceToken(fixture.env, workspaceId)
  await suspendUser(workspaceRuntime(fixture.env), 11, 'active-admin')
  await reassignRuntimeWorkspace(fixture, workspaceId)
  await queueRuntimeResume(fixture, workspaceId)
  await workspaceOwnerChangedHook(workspaceRuntime(fixture.env))(workspaceId)
  expect(await finishRuntimeStart(fixture, workspaceId)).toEqual({ ok: true })
  await expect(readWorkspaceToken(fixture.env, workspaceId)).resolves.not.toBe(
    oldToken,
  )
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
})
