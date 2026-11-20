import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import {
  assertRetryDay,
  nativeRetryProbe,
  refuseAction,
  retryActor,
  seedRetryWorkspace,
} from './background-retry.test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { initialLifecycle } from './durable-start'
import { LIFECYCLE_STATE_KEY } from './durable-types'
import { readRetention, setRetention } from './retention-data'

const fixtureForTest = setupBackendTests()
const failure = 'The startup script failed during disk retention.'

it.each(['get', 'stop'] as const)(
  'keeps retention errors and provider waits when the cleanup %s fails for a day',
  async (operation) => {
    const fixture = fixtureForTest()
    const id = 'retention-retry'
    const sandboxId = 'retention-computer'
    await seedRetryWorkspace(fixture, id, sandboxId)
    const actor = retryActor(fixture, id)
    const now = fixture.runtime.dependencies.now()
    const deadlineAt = now - 1
    await actor.storage.put(LIFECYCLE_STATE_KEY, {
      ...initialLifecycle(
        { workspaceId: id, orgId: fixture.org.id, firstMessage: FIRST_MESSAGE },
        now,
      ),
      state: 'stopped',
      stoppedAt: now - 1_123_200_000,
      nextDiskKeepaliveAt: now,
      diskRetentionDeadlineAt: deadlineAt,
      diskRetentionCommand: {
        attempt: 'failed-retention',
        processId: null,
        stdoutOffset: 0,
        stderrOffset: 0,
      },
    })
    await fixture.runtime.env.DB.prepare(
      "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
    )
      .bind(id)
      .run()
    await setRetention(fixture.runtime.env.DB, id, 'stop', failure)
    fixture.boat.states.set(sandboxId, 'ready')
    const fault = refuseAction(fixture, operation, sandboxId)
    const probe = nativeRetryProbe(fixture, actor, id, 'lifecycle', fault.calls)
    await assertRetryDay(probe)
    expect(fault.reads()).toBe(30)
    expect(await readRetention(fixture.runtime.env.DB, id)).toEqual({
      phase: 'stop',
      error: failure,
    })
    expect(await actor.endpoint().readLifecycle()).toMatchObject({
      diskRetentionDeadlineAt: deadlineAt,
      error: { message: failure },
    })

    const at = now + 86_610_000
    await probe.setTime(at)
    fault.fail('7200')
    await probe.run()
    expect(await probe.alarm()).toBe(at + 3_600_000)
    await expect(
      actor.endpoint().finishDiskMaintenance(),
    ).rejects.toMatchObject({
      code: 'workspace_start_failed',
    })
    expect(fault.calls()).toBe(31)
    await probe.setTime(at + 3_600_000)
    fault.succeed()
    await probe.run()
    expect(fault.calls()).toBe(32)
    expect(await readRetention(fixture.runtime.env.DB, id)).toBeNull()
    expect((await actor.endpoint().readLifecycle())?.retry).toBeUndefined()
    const stopped = await actor.endpoint().readLifecycle()
    if (!stopped) throw new Error('Missing retained lifecycle')
    await actor.storage.put(LIFECYCLE_STATE_KEY, {
      ...stopped,
      nextDiskKeepaliveAt: probe.now(),
      diskRetentionDeadlineAt: deadlineAt,
      diskRetentionCommand: {
        attempt: 'next-retention',
        processId: null,
        stdoutOffset: 0,
        stderrOffset: 0,
      },
    })
    await setRetention(fixture.runtime.env.DB, id, 'stop', failure)
    fixture.boat.states.set(sandboxId, 'ready')
    fault.fail('120')
    const resetAt = probe.now()
    await probe.run()
    expect(fault.calls()).toBe(33)
    expect(await probe.alarm()).toBe(resetAt + 120_000)
    await probe.setTime(resetAt + 120_000)
    fault.fail('7200')
    await probe.run()
    expect(await probe.alarm()).toBe(resetAt + 3_720_000)
    await probe.setTime(resetAt + 3_720_000)
    fault.fail()
    await probe.run()
    expect(await probe.alarm()).toBe(resetAt + 3_840_000)
  },
)
