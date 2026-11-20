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
import { setRetention } from './retention-data'

const fixtureForTest = setupBackendTests()

it('keeps a provider Retry-After when publication of its failed stop also fails', async () => {
  const fixture = fixtureForTest()
  const id = 'provider-wait-publication'
  const sandboxId = 'publication-computer'
  await seedRetryWorkspace(fixture, id, sandboxId)
  const actor = retryActor(fixture, id)
  const now = fixture.runtime.dependencies.now()
  await actor.storage.put(LIFECYCLE_STATE_KEY, {
    ...initialLifecycle(
      { workspaceId: id, orgId: fixture.org.id, firstMessage: FIRST_MESSAGE },
      now,
    ),
    state: 'stopped',
    nextDiskKeepaliveAt: now,
    stoppedAt: now - 1_123_200_000,
    diskRetentionDeadlineAt: now - 1,
    diskRetentionCommand: {
      attempt: 'publication-retention',
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
  await setRetention(fixture.runtime.env.DB, id, 'stop', 'The script failed.')
  await fixture.runtime.env.DB.prepare(
    `CREATE TRIGGER fail_retry_publication BEFORE UPDATE OF state ON workspaces
     WHEN NEW.id = 'provider-wait-publication'
     BEGIN SELECT RAISE(ABORT, 'retry publication failed'); END`,
  ).run()
  fixture.boat.states.set(sandboxId, 'ready')
  const fault = refuseAction(fixture, 'stop', sandboxId)
  fault.fail('120')
  const probe = nativeRetryProbe(fixture, actor, id, 'lifecycle', fault.calls)
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(fault.reads()).toBe(1)
  expect((await actor.endpoint().readLifecycle())?.retry).toEqual({
    failures: 1,
    at: now + 120_000,
  })
  expect(await probe.alarm()).toBe(now + 120_000)
  expect(await actor.storage.get('alarm:lifecycle:changed')).toBe(now + 30_000)
  await fixture.runtime.env.DB.prepare(
    'DROP TRIGGER fail_retry_publication',
  ).run()
  await probe.setTime(now + 30_000)
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(fault.reads()).toBe(1)
  expect(await actor.storage.get('alarm:lifecycle:changed')).toBeUndefined()
  expect(await probe.alarm()).toBe(now + 120_000)
})
