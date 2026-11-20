import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import {
  nativeRetryProbe,
  refuseAction,
  retryActor,
  seedRetryWorkspace,
} from './background-retry.test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { initialLifecycle } from './durable-start'
import { LIFECYCLE_STATE_KEY } from './durable-types'
import { readRetention } from './retention-data'

const fixtureForTest = setupBackendTests()
const timeout =
  'The cloud computer did not start within the 20-minute limit. Try again.'

it('expires retention locally at its deadline while the provider waits for Retry-After', async () => {
  const fixture = fixtureForTest()
  const id = 'retention-deadline'
  const sandboxId = 'deadline-computer'
  await seedRetryWorkspace(fixture, id, sandboxId)
  const actor = retryActor(fixture, id)
  const now = fixture.runtime.dependencies.now()
  const deadlineAt = now + 60_000
  await actor.storage.put(LIFECYCLE_STATE_KEY, {
    ...initialLifecycle(
      { workspaceId: id, orgId: fixture.org.id, firstMessage: FIRST_MESSAGE },
      now,
    ),
    state: 'stopped',
    nextDiskKeepaliveAt: now,
    stoppedAt: now - 1_123_200_000,
    diskRetentionDeadlineAt: deadlineAt,
    diskRetentionCommand: {
      attempt: 'deadline-retention',
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
  fixture.boat.states.set(sandboxId, 'archived')
  const fault = refuseAction(fixture, 'resume', sandboxId)
  fault.fail('3600')
  const probe = nativeRetryProbe(fixture, actor, id, 'lifecycle', fault.calls)
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(await probe.alarm()).toBe(deadlineAt)
  await probe.setTime(deadlineAt)
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(fault.reads()).toBe(1)
  expect(await readRetention(fixture.runtime.env.DB, id)).toEqual({
    phase: 'stop',
    error: timeout,
  })
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    diskRetentionDeadlineAt: deadlineAt,
    retry: { failures: 1, at: now + 3_600_000 },
    error: { code: 'workspace_start_failed', message: timeout, log: null },
  })
  expect(await probe.alarm()).toBe(now + 3_600_000)
  await probe.setTime(now + 3_600_000)
  fault.succeed()
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(await readRetention(fixture.runtime.env.DB, id)).toBeNull()
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    retry: undefined,
    error: { message: timeout },
  })
})
