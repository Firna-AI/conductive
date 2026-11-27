import { expect, it } from 'vitest'

import { TERMINAL_RESTORE_MARKER } from '../terminal/scripts'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { pendingCreate } from './start-chain.test-support'
import { startRetryFixture } from './retry-test-support'
import { serializeStartJob } from './start-job-codec'
import { START_JOB_KEY } from './start-storage'
import type { WorkspaceValues } from './platform-storage'

const fixtureForTest = setupBackendTests()

it('writes the restore marker while the fetch command is still running', async () => {
  const fixture = fixtureForTest()
  fixture.boat.hydrated = false
  const start = await pendingCreate(fixture)
  const readyAt = TEST_TIME + 1_000
  await start.actor.advance(readyAt)
  expect(await start.job()).toMatchObject({ phase: 'fetch', processId: 1 })
  fixture.boat.commandRunning = true
  fixture.boat.hydrated = true
  const reads = fixture.boat.sandboxReads.length
  const markers = () =>
    fixture.boat.commandRequests.filter(({ command }) =>
      command.includes(TERMINAL_RESTORE_MARKER),
    )

  await start.actor.advance(readyAt + 4_999)
  expect(fixture.boat.sandboxReads.slice(reads)).toEqual([])
  expect(markers()).toEqual([])
  await start.actor.advance(readyAt + 5_000)
  expect(markers()).toMatchObject([{ sandboxId: 'bx_1', detached: false }])
  expect(fixture.boat.sandboxReads.slice(reads)).toEqual(['bx_1'])
  expect(await start.job()).toMatchObject({ phase: 'fetch', processId: 1 })
})

it('polls a running command at 250 ms through reconstruction, clears regular deferral, and backs off at five seconds', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const now = fixture.runtime.dependencies.now()
  fixture.boat.commandRunning = true
  expect(await start.job()).toMatchObject({ waitStartedAt: now })
  expect(await start.storage.getAlarm()).toBe(now + 250)
  expect(
    await start.storage.get('security:regular-alarms-deferred-until'),
  ).toBeUndefined()
  await start.restart()
  await start.tick(now + 250)
  expect(await start.storage.getAlarm()).toBe(now + 500)
  await start.tick(now + 4_750)
  expect(await start.storage.getAlarm()).toBe(now + 5_000)
  await start.tick(now + 5_000)
  expect(await start.storage.getAlarm()).toBe(now + 6_000)
  expect(await start.job()).toMatchObject({ waitStartedAt: now })
})

it('polls provider readiness at 250 ms for five seconds and keeps the machine wait at one second', async () => {
  const fixture = fixtureForTest()
  const start = await pendingCreate(fixture)
  fixture.boat.afterCreate = async (id) => {
    fixture.boat.states.set(id, 'provisioning')
  }
  await start.actor.advance(TEST_TIME + 1_000)
  expect(await start.job()).toMatchObject({
    phase: 'ready',
    waitStartedAt: TEST_TIME + 1_000,
  })
  expect(await start.actor.storage.getAlarm()).toBe(TEST_TIME + 1_250)
  await start.restart()
  await start.actor.advance(TEST_TIME + 5_750)
  expect(await start.actor.storage.getAlarm()).toBe(TEST_TIME + 6_000)
  await start.actor.advance(TEST_TIME + 6_000)
  expect(await start.actor.storage.getAlarm()).toBe(TEST_TIME + 7_000)
  const ready = await start.stored()
  if (ready.phase !== 'ready') throw new Error('Missing readiness wait')
  await start.save({
    ...ready,
    phase: 'machine',
    waitStartedAt: TEST_TIME + 7_000,
  })
  await start.actor.advance(TEST_TIME + 7_000)
  expect(await start.job()).toMatchObject({ phase: 'machine' })
  expect(await start.actor.storage.getAlarm()).toBe(TEST_TIME + 8_000)
})

it('uses the old one-second poll and refreshes auto-stop for a saved job without either optional field', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing command wait')
  delete job.waitStartedAt
  delete job.autoStopSetAt
  await start.storage.put<WorkspaceValues['job']>(
    START_JOB_KEY,
    serializeStartJob(job),
  )
  await start.restart()
  fixture.boat.commandRunning = true
  const calls = fixture.boat.deadlineIds.length
  await start.advance()
  const now = fixture.runtime.dependencies.now()
  expect(fixture.boat.deadlineIds).toHaveLength(calls + 1)
  expect(await start.job()).toMatchObject({ autoStopSetAt: now })
  expect((await start.job())?.waitStartedAt).toBeUndefined()
  expect(await start.storage.getAlarm()).toBe(now + 1_000)
})
