import { afterEach, beforeAll, expect, it } from 'vitest'

import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  featureFixture,
  type FeatureFixture,
} from '../features/fixture.test-support'
import type { Workspace } from './pending-access-stop-entry.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/lifecycle/pending-access-stop-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
})

it('retries a pending access stop once per due native alarm with a future lifecycle time', async () => {
  const active = (fixture = await featureFixture(bundle))
  const bindings = await active.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  const now = await actor.testAlarmTime()
  await active.env.DB.batch([
    active.env.DB.prepare(
      "UPDATE users SET suspended_at = ? WHERE id = 'owner'",
    ).bind(now),
    active.env.DB.prepare(
      "UPDATE workspaces SET sandbox_id = 'bx_pending_access' WHERE id = ?",
    ).bind(OUTER_WORKSPACE),
  ])
  active.boat.stopReplyState = 'ready'
  await actor.seedFeatureState({
    'lifecycle:state': {
      workspaceId: OUTER_WORKSPACE,
      orgId: OUTER_ORG,
      state: 'ready',
      start: null,
      pendingFirstMessage: null,
      lastActivityAt: now,
      runningSessions: [],
      runnerConnected: true,
      stoppedAt: null,
      nextDiskKeepaliveAt: null,
      error: null,
    },
    'alarm:lifecycle': now,
  })
  expect(await actor.advanceOneAlarm(now)).toBe(1)
  expect(active.boat.stopIds).toEqual(['bx_pending_access'])
  expect(await actor.readAlarmTimes()).toEqual({
    next: now + 30_000,
    lifecycle: now + 30_000,
    access: now + 30_000,
  })
  expect(await actor.advanceOneAlarm(now + 29_999)).toBe(0)
  expect(active.boat.stopIds).toEqual(['bx_pending_access'])
  expect(await actor.advanceOneAlarm(now + 30_000)).toBe(1)
  expect(active.boat.stopIds).toEqual([
    'bx_pending_access',
    'bx_pending_access',
  ])
  expect(await actor.readAlarmTimes()).toEqual({
    next: now + 60_000,
    lifecycle: now + 60_000,
    access: now + 60_000,
  })
  expect(await actor.advanceOneAlarm(now + 60_000)).toBe(1)
  expect(active.boat.stopIds).toEqual([
    'bx_pending_access',
    'bx_pending_access',
    'bx_pending_access',
  ])
  expect(await actor.readAlarmTimes()).toEqual({
    next: now + 90_000,
    lifecycle: now + 90_000,
    access: now + 90_000,
  })
})
