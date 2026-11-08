import { beforeAll, expect, it } from 'vitest'

import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import type { Workspace } from '../features/activity-entry.test-support'
import { activityFixture } from '../features/activity.test-support'
import { workspaceRuntime } from '../lifecycle/runtime'
import { suspendOrg } from './suspend-org'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/activity-entry.test-support.ts',
  )
})

it('keeps suspended input-owner records, captures and coalesced retries from changing activity or deadlines and warns safely', async () => {
  const warnings: unknown[] = []
  const fixture = await activityFixture(bundle, {
    handleStructuredLogs: (event) => {
      if (event.level === 'warn') warnings.push(event)
    },
  })
  try {
    const { WORKSPACES } = await fixture.runtime.getBindings<{
      WORKSPACES: DurableObjectNamespace<Workspace>
    }>()
    const actor = fixture.actor()
    fixture.boat.stopReplyState = 'running'
    const suspended = await suspendOrg(
      workspaceRuntime({ ...fixture.env, WORKSPACES }),
      OUTER_ORG,
      'owner',
    )
    expect(suspended.pendingWorkspaceIds).toEqual([OUTER_WORKSPACE])
    const before = (await actor.readLifecycle())?.lastActivityAt
    const alarm = await actor.readActivityAlarm()
    const deadlines = [...fixture.boat.deadlineIds]
    const activity = () =>
      fixture.env.DB.prepare(
        'SELECT last_activity_at AS activity FROM workspaces WHERE id = ?',
      )
        .bind(OUTER_WORKSPACE)
        .first('activity')
    const stored = await activity()
    expect(alarm).not.toBeNull()
    await actor.recordInputBatch(OUTER_WORKSPACE, [
      fixture.now + 1,
      fixture.now + 2,
      fixture.now + 3,
    ])
    await actor.waitForActivity()
    expect((await actor.readLifecycle())?.lastActivityAt).toBe(before)
    expect(await activity()).toBe(stored)
    expect(fixture.boat.deadlineIds).toEqual(deadlines)
    expect(await actor.readActivityAlarm()).toBe(alarm)
    await expect.poll(() => warnings.length, { timeout: 10000 }).toBe(2)
    expect(JSON.stringify(warnings)).toContain(
      'Workspace activity timestamp could not be saved.',
    )
    expect(JSON.stringify(warnings)).toContain(
      'Workspace activity update failed.',
    )
    await actor.advanceActivity(20_000)
    await actor.recordInputBatch(OUTER_WORKSPACE, [
      fixture.now + 20_001,
      fixture.now + 20_002,
      fixture.now + 20_003,
    ])
    await actor.waitForLocalActivity()
    await expect.poll(() => warnings.length, { timeout: 10000 }).toBe(3)
    await actor.advanceActivity(39_999)
    await actor.waitForActivity()
    expect(warnings).toHaveLength(3)
    await actor.advanceActivity(1)
    await actor.waitForActivity()
    await expect.poll(() => warnings.length, { timeout: 10000 }).toBe(4)
    expect(
      JSON.stringify(warnings).match(
        /Workspace activity timestamp could not be saved\./g,
      ),
    ).toHaveLength(2)
    expect(
      JSON.stringify(warnings).match(/Workspace activity update failed\./g),
    ).toHaveLength(2)
    expect((await actor.readLifecycle())?.lastActivityAt).toBe(before)
    expect(await activity()).toBe(stored)
    expect(fixture.boat.deadlineIds).toEqual(deadlines)
    expect(await actor.readActivityAlarm()).toBe(alarm)
    expect(JSON.stringify(warnings)).not.toContain('org_suspended')
  } finally {
    await fixture.dispose()
  }
})
