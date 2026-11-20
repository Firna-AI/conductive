import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  nativeRetryProbe,
  refuseAction,
  retryActor,
  seedRetryWorkspace,
} from './background-retry.test-support'
import { archiveFixture } from './archive-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { initialLifecycle } from './durable-start'
import { LIFECYCLE_STATE_KEY } from './durable-types'
import { repairLifecycleAlarms } from './repair'
import { setRetention } from './retention-data'

const fixtureForTest = setupBackendTests()

it('preserves a saved archive wait when Cron repairs a stale D1 signal', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + 86_400_000)
  await saved.archive()
  const fault = refuseAction(fixture, 'resume', saved.sandboxId)
  fault.fail('3600')
  const restart = TEST_TIME + 13 * 86_400_000
  await fixture.advanceTo(restart, saved.id)
  await fixture.runtime.env.DB.prepare(
    'UPDATE workspaces SET next_disk_keepalive_at = ? WHERE id = ?',
  )
    .bind(restart - 900_000, saved.id)
    .run()
  await fixture.setTime(restart + 1_000)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toMatchObject({ workspaces: 1, pendingWorkspaces: 0 })
  await fixture.advanceTo(restart + 1_000, saved.id)
  expect(fault.calls()).toBe(1)
  expect(await saved.actor.storage.get('alarm:lifecycle:archive')).toBe(
    restart + 3_600_000,
  )
})

it('preserves retention waits during Cron and gives a legacy access repair one immediate attempt', async () => {
  const fixture = fixtureForTest()
  const id = 'repair-retention'
  const sandboxId = 'repair-computer'
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
      attempt: 'repair-retention',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
    },
  })
  await fixture.runtime.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped', next_disk_keepalive_at = ? WHERE id = ?",
  )
    .bind(now - 900_000, id)
    .run()
  await setRetention(fixture.runtime.env.DB, id, 'stop', 'The script failed.')
  fixture.boat.states.set(sandboxId, 'ready')
  const fault = refuseAction(fixture, 'stop', sandboxId)
  fault.fail('3600')
  const probe = nativeRetryProbe(fixture, actor, id, 'lifecycle', fault.calls)
  await probe.run()
  await fixture.runtime.env.DB.prepare(
    'UPDATE workspaces SET next_disk_keepalive_at = ? WHERE id = ?',
  )
    .bind(now - 900_000, id)
    .run()
  await fixture.setTime(now + 1_000)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toMatchObject({ workspaces: 1, pendingWorkspaces: 0 })
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(await probe.alarm()).toBe(now + 3_600_000)
  fault.fail()
  await actor.endpoint().reconcileLifecycleAccess(id)
  await probe.run()
  expect(fault.calls()).toBe(2)
  expect(await probe.alarm()).toBe(now + 61_000)
  await probe.run()
  expect(fault.calls()).toBe(2)
})
