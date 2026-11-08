import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { boatRoute } from '../sandbox/routes'
import { suspendUser } from '../operator/suspend-user'
import { setupBackendTests } from './backend-test-hooks'
import { resumedStartup } from './start-resume-test-support'
import {
  addRetentionAdmin,
  reassignRetentionOwner,
  stoppedRetentionFixture,
  retentionDates,
} from './retention-dates-test-support'

const fixtureForTest = setupBackendTests()
const DUE = TEST_TIME + 1_123_200_000
const TIMEOUT =
  'The cloud computer did not start within the 20-minute limit. Try again.'

it('restarts a physically stopped failed resume on day thirteen and keeps its saved error and dates through ownership changes', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing failed resume')
  const platform = fixture.actors.get(job.workspaceId)
  if (!platform) throw new Error('Missing failed-resume controller')
  fixture.boat.commandRunning = true
  await start.tick(TEST_TIME + 1_230_000)
  const stopped = await start.actor.readLifecycle()
  start.restart()
  await start.tick(TEST_TIME + 1_235_000)
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'error',
    startStop: 'stopped',
    stoppedAt: TEST_TIME + 1_230_000,
    nextDiskKeepaliveAt: TEST_TIME + 1_124_430_000,
    error: { message: TIMEOUT },
  })
  await start.tick(TEST_TIME + 1_124_429_999)
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  await start.tick(TEST_TIME + 1_124_430_000)
  expect(fixture.boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  fixture.boat.commandRunning = false
  fixture.boat.commandExitCode = 1
  for (const offset of [5_000, 10_000, 15_000, 20_000])
    await start.tick(TEST_TIME + 1_124_430_000 + offset)
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'error',
    error: stopped?.error,
    stoppedAt: TEST_TIME + 1_124_450_000,
    nextDiskKeepaliveAt: TEST_TIME + 2_247_650_000,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
  })
  await addRetentionAdmin(fixture)
  fixture.setTime(TEST_TIME + 1_124_460_000)
  await suspendUser(fixture.runtime, fixture.user.githubId, 'retention-admin')
  expect(platform.storage.alarmAt).toBeNull()
  await reassignRetentionOwner(fixture, job.workspaceId)
  expect(platform.storage.alarmAt).toBe(TEST_TIME + 2_247_650_000)
  expect(await start.actor.readLifecycle()).toMatchObject({
    error: { message: TIMEOUT },
    stoppedAt: TEST_TIME + 1_124_450_000,
    nextDiskKeepaliveAt: TEST_TIME + 2_247_650_000,
  })
})

it('clears suspended maintenance on confirmed stop and starts a fresh overdue attempt after delayed reassignment', async () => {
  const fixture = await stoppedRetentionFixture(fixtureForTest())
  await addRetentionAdmin(fixture)
  await fixture.tick(DUE)
  expect(await fixture.progress()).toEqual({ phase: 'wait', error: null })
  fixture.boat.states.set('bx_1', 'provisioning')
  fixture.setTime(DUE + 10_000)
  await suspendUser(fixture.runtime, fixture.user.githubId, 'retention-admin')
  expect(await fixture.progress()).toBeNull()
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: TEST_TIME,
    nextDiskKeepaliveAt: DUE,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
    error: null,
  })
  expect(fixture.platform.storage.alarmAt).toBeNull()
  fixture.platform.restart()
  fixture.setTime(TEST_TIME + 1_987_200_000)
  await reassignRetentionOwner(fixture, fixture.id)
  expect(fixture.platform.storage.alarmAt).toBe(DUE)
  await fixture.tick(TEST_TIME + 1_987_200_000)
  expect(fixture.boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  expect(await fixture.progress()).toEqual({ phase: 'wait', error: null })
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: TEST_TIME,
    nextDiskKeepaliveAt: DUE,
    diskRetentionDeadlineAt: TEST_TIME + 1_988_400_000,
    error: null,
  })
})

it('keeps the real disk date when maintenance resume is refused through its original deadline', async () => {
  const fixture = await stoppedRetentionFixture(fixtureForTest())
  const route = boatRoute({ operation: 'resume', sandboxId: 'bx_1' })
  const fetch = fixture.runtime.dependencies.fetch
  let refused = true
  let requests = 0
  fixture.runtime.dependencies.fetch = async (request) => {
    if (refused && new URL(request.url).pathname.endsWith(route.path)) {
      requests++
      return Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
    }
    return fetch(request)
  }
  await fixture.tick(DUE)
  fixture.platform.restart()
  await fixture.tick(DUE + 1_199_999)
  await fixture.tick(DUE + 1_200_000)
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: TEST_TIME,
    nextDiskKeepaliveAt: DUE,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
    error: { message: TIMEOUT },
  })
  expect(requests).toBe(2)
  expect(fixture.boat.resumeIds).toEqual([])
  expect(fixture.boat.stopIds).toEqual([])
  expect(await fixture.progress()).toBeNull()
  expect(fixture.platform.storage.alarmAt).toBe(DUE + 1_205_000)
  refused = false
  fixture.platform.restart()
  await fixture.tick(DUE + 1_205_000)
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: TEST_TIME,
    nextDiskKeepaliveAt: DUE,
    diskRetentionDeadlineAt: DUE + 2_405_000,
  })
})

it('renews disk retention from its own saved stop request across stopping replies, reconstruction, and external confirmation', async () => {
  const fixture = await stoppedRetentionFixture(fixtureForTest())
  for (const offset of [0, 5_000, 10_000, 15_000])
    await fixture.tick(DUE + offset)
  fixture.boat.stopReplyState = 'archiving'
  await fixture.tick(DUE + 20_000)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  fixture.platform.restart()
  await fixture.tick(DUE + 25_000)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  fixture.boat.states.set('bx_1', 'archived')
  await fixture.tick(DUE + 30_000)
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: DUE + 20_000,
    nextDiskKeepaliveAt: TEST_TIME + 2_246_420_000,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
  })
  expect(await retentionDates(fixture, fixture.id)).toMatchObject({
    stoppedAt: DUE + 20_000,
    nextDiskKeepaliveAt: TEST_TIME + 2_246_420_000,
  })
  expect(await fixture.progress()).toBeNull()

  const nextDue = TEST_TIME + 2_246_420_000
  for (const offset of [0, 5_000, 10_000, 15_000, 20_000])
    await fixture.tick(nextDue + offset)
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    diskRetentionCommand: { stopRequestedAt: TEST_TIME + 2_246_440_000 },
  })
  fixture.boat.states.set('bx_1', 'archived')
  fixture.setTime(nextDue + 30_000)
  fixture.platform.restart()
  await fixture.platform.endpoint().lifecycleStopped()
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: TEST_TIME + 2_246_440_000,
    nextDiskKeepaliveAt: TEST_TIME + 3_369_640_000,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
  })
  expect(await retentionDates(fixture, fixture.id)).toEqual({
    stoppedAt: TEST_TIME + 2_246_440_000,
    nextDiskKeepaliveAt: TEST_TIME + 3_369_640_000,
  })
  expect(await fixture.progress()).toBeNull()
})
