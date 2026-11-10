import { beforeAll, expect, it } from 'vitest'

import { orgSuspensionPath } from '../../src/shared/operator'
import { workspacePaths } from '../../src/shared/workspaces'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { backendFixture } from '../lifecycle/backend-test-support'
import { runtimeBundle } from '../lifecycle/real-runtime-test-support'
import {
  activityRaceFixture,
  heldActivityBody,
} from './activity-race.test-support'
import { existingWorkspace } from './suspension-test-support'
import { suspendOrg } from './suspend-org'

const message =
  'This org is suspended. For questions, write to abuse@conductive.build.'
let bundle: string
beforeAll(async () => {
  bundle = await runtimeBundle()
})

it('refuses held HTTP activity after org suspension without changing its deadline, activity or stop alarm', async () => {
  const fixture = await activityRaceFixture(bundle)
  const { actor, workspaceId, sandboxId } = fixture
  const source = { source: 'input' }
  const held = heldActivityBody(
    fixture.request(
      workspacePaths.activity('runtime-org', workspaceId),
      source,
    ),
    source,
  )
  const changing = fixture.send(held.request)
  try {
    const readiness = await Promise.race([
      held.reading.then(() => 'reading'),
      changing.then((response) => `early response ${response.status}`),
    ])
    expect(readiness).toBe('reading')
    fixture.boat.stopReplyState = 'running'
    const suspended = await fixture.send(
      fixture.request(orgSuspensionPath('runtime-org'), {}),
    )
    expect(suspended.status).toBe(202)
    expect(await suspended.json()).toMatchObject({
      pendingWorkspaceIds: [workspaceId],
      pendingBuildIds: [],
    })
    expect(fixture.boat.stopIds).toEqual([sandboxId])
    const before = await actor.readLifecycle()
    if (!before) throw new Error('Missing suspended lifecycle')
    const alarm = await actor.alarmAt()
    const deadlines = [...fixture.boat.deadlineIds]
    expect(alarm).not.toBeNull()
    held.release()
    const response = await changing
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: { code: 'org_suspended', message },
    })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(fixture.boat.deadlineIds).toEqual(deadlines)
    expect((await actor.readLifecycle())?.lastActivityAt).toBe(
      before.lastActivityAt,
    )
    expect(await actor.alarmAt()).toBe(alarm)
    fixture.boat.stopReplyState = 'archived'
    expect(await actor.fireScheduledAlarm()).toBe(true)
    const stopped = await actor.readLifecycle()
    expect(stopped?.state).toBe('stopped')
    const result = await actor.lifecycleActivity()
    const reply = result.ok
      ? { ok: true }
      : {
          ok: false,
          error: { code: result.error.code, message: result.error.message },
        }
    expect(reply).toEqual({
      ok: false,
      error: { code: 'org_suspended', message },
    })
    expect(fixture.boat.deadlineIds).toEqual(deadlines)
    expect((await actor.readLifecycle())?.lastActivityAt).toBe(
      stopped?.lastActivityAt,
    )
    expect(await actor.alarmAt()).toBeNull()
  } finally {
    held.release()
    await Promise.allSettled([changing])
    await fixture.dispose()
  }
})

it('refuses a trusted turn in a suspended org before changing its provider deadline', async () => {
  const fixture = await backendFixture()
  try {
    const { id: workspaceId } = await existingWorkspace(
      fixture,
      'suspended-turn',
    )
    const platform = fixture.actors.get(workspaceId)
    if (!platform) throw new Error('Missing production workspace controller')
    const actor = platform.endpoint()
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.registerLifecycleTurn({
      turnId: 'turn-one',
      sessionId: 'session-one',
      senderUserId: fixture.user.id,
    })
    await fixture.setTime(fixture.runtime.dependencies.now() + 1_000)
    fixture.boat.stopReplyState = 'running'
    const suspended = await suspendOrg(
      fixture.runtime,
      fixture.org.id,
      fixture.user.id,
    )
    expect(suspended.pendingWorkspaceIds).toEqual([workspaceId])
    const before = await actor.readLifecycle()
    if (!before) throw new Error('Missing suspended lifecycle')
    const alarm = await platform.storage.getAlarm()
    const deadlines = [...fixture.boat.deadlineIds]
    const turn = await Promise.allSettled([
      platform.expectedRunnerReport({
        type: 'turn.started',
        turnId: 'turn-one',
        sessionId: 'session-one',
        senderId: fixture.user.id,
        choice: FIRST_MESSAGE.choice,
        startedAt: Date.now(),
        messageIds: [FIRST_MESSAGE.id],
      }),
    ])
    expect(fixture.boat.deadlineIds).toEqual(deadlines)
    expect(turn).toMatchObject([
      {
        status: 'rejected',
        reason: { status: 403, code: 'org_suspended', message },
      },
    ])
    expect((await actor.readLifecycle())?.lastActivityAt).toBe(
      before.lastActivityAt,
    )
    expect(await platform.storage.getAlarm()).toBe(alarm)
  } finally {
    await fixture.dispose()
  }
})
