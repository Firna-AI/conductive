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
import { IDLE_MS, LIFECYCLE_STATE_KEY } from './durable-types'

const fixtureForTest = setupBackendTests()

it.each(['idle-pending', 'failed-start-pending', 'idle-refused'] as const)(
  'backs off %s lifecycle stops for a day without calls from early or recovered alarms',
  async (kind) => {
    const fixture = fixtureForTest()
    const id = `stop-${kind}`
    const sandboxId = `computer-${kind}`
    await seedRetryWorkspace(fixture, id, sandboxId)
    const actor = retryActor(fixture, id)
    const now = fixture.runtime.dependencies.now()
    await actor.storage.put(LIFECYCLE_STATE_KEY, {
      ...initialLifecycle(
        { workspaceId: id, orgId: fixture.org.id, firstMessage: FIRST_MESSAGE },
        now - IDLE_MS,
      ),
      state: kind === 'failed-start-pending' ? 'error' : 'ready',
      runnerConnected: kind !== 'failed-start-pending',
      ...(kind === 'failed-start-pending' ? { startStop: 'pending' } : {}),
    })
    fixture.boat.states.set(sandboxId, 'ready')
    fixture.boat.stopReplyState = 'ready'
    const fault = refuseAction(fixture, 'stop', sandboxId)
    if (kind !== 'idle-refused') fault.succeed()
    const probe = nativeRetryProbe(fixture, actor, id, 'lifecycle', fault.calls)
    await assertRetryDay(probe)
    expect(fault.reads()).toBe(kind === 'idle-refused' ? 30 : 0)

    await probe.setTime(now + 86_610_000)
    fault.fail('7200')
    await probe.run()
    expect(await probe.alarm()).toBe(now + 90_210_000)
    await probe.setTime(now + 90_210_000)
    fault.succeed()
    fixture.boat.stopReplyState = 'archived'
    await probe.run()
    expect(fault.calls()).toBe(32)
    expect(await actor.endpoint().readLifecycle()).toMatchObject({
      runnerConnected: false,
      stoppedAt: now + 90_210_000,
    })
    expect((await actor.endpoint().readLifecycle())?.retry).toBeUndefined()
    const stopped = await actor.endpoint().readLifecycle()
    if (!stopped) throw new Error('Missing stopped lifecycle')
    await actor.storage.put(LIFECYCLE_STATE_KEY, {
      ...stopped,
      state: 'ready',
      startStop: kind === 'failed-start-pending' ? 'pending' : undefined,
      runnerConnected: kind !== 'failed-start-pending',
      lastActivityAt: probe.now() - IDLE_MS,
    })
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
