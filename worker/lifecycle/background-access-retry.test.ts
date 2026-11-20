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

const fixtureForTest = setupBackendTests()

it.each(['pending', 'refused'] as const)(
  'backs off a %s access stop for a day and gives an owner repair one immediate attempt',
  async (kind) => {
    const fixture = fixtureForTest()
    const id = 'access-retry'
    const sandboxId = 'access-computer'
    await seedRetryWorkspace(fixture, id, sandboxId)
    const actor = retryActor(fixture, id)
    const initial = initialLifecycle(
      { workspaceId: id, orgId: fixture.org.id, firstMessage: FIRST_MESSAGE },
      fixture.runtime.dependencies.now(),
    )
    await actor.storage.put(LIFECYCLE_STATE_KEY, {
      ...initial,
      state: 'ready',
      runnerConnected: true,
    })
    await fixture.runtime.env.DB.prepare(
      'UPDATE users SET suspended_at = ? WHERE id = ?',
    )
      .bind(fixture.runtime.dependencies.now(), fixture.user.id)
      .run()
    fixture.boat.states.set(sandboxId, 'ready')
    fixture.boat.stopReplyState = 'ready'
    const fault = refuseAction(fixture, 'stop', sandboxId)
    if (kind === 'pending') fault.succeed()
    const probe = nativeRetryProbe(
      fixture,
      actor,
      id,
      'lifecycle:access',
      fault.calls,
    )
    await assertRetryDay(probe)
    expect(fault.reads()).toBe(kind === 'refused' ? 30 : 0)

    const repairedAt = probe.now()
    await actor.endpoint().reconcileLifecycleAccess(id)
    expect(fault.calls()).toBe(31)
    expect(await probe.alarm()).toBe(repairedAt + 3_600_000)
    await probe.run()
    expect(fault.calls()).toBe(31)
    await probe.setTime(repairedAt + 3_600_000)
    fault.fail('7200')
    await probe.run()
    expect(await probe.alarm()).toBe(repairedAt + 7_200_000)
    await probe.setTime(repairedAt + 7_200_000)
    fault.succeed()
    fixture.boat.stopReplyState = 'archived'
    await probe.run()
    expect(fault.calls()).toBe(33)
    expect(await probe.alarm()).toBeUndefined()
    expect(await actor.endpoint().readLifecycle()).toMatchObject({
      state: 'stopped',
      runnerConnected: false,
    })
    await fixture.runtime.env.DB.prepare(
      "UPDATE workspaces SET state = 'ready' WHERE id = ?",
    )
      .bind(id)
      .run()
    fixture.boat.states.set(sandboxId, 'ready')
    fault.fail('120')
    const resetAt = probe.now()
    await probe.run()
    expect(fault.calls()).toBe(34)
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
