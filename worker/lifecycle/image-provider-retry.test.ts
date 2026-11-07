import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { imageRetryFixture, statusFault } from './retry-test-support'

const backendFixture = setupBackendTests()

it('bounds lasting image status faults across alarm restarts while reads and deadline updates succeed', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture)
  statusFault(fixture)
  const now = fixture.runtime.dependencies.now()
  const reads = fixture.boat.sandboxReads.length
  const deadlines = fixture.boat.deadlineIds.length
  const alarms: (number | null)[] = []
  let beforeEarly = 0
  let afterEarly = 0
  let earlyAlarm: number | null = null
  for (const offset of [
    0, 1_000, 3_000, 7_000, 15_000, 31_000, 63_000, 123_000, 183_000, 590_000,
  ]) {
    await image.tick(now + offset)
    alarms.push(image.storage.alarmAt)
    if (offset === 1_000) {
      beforeEarly = fixture.boat.statusRequests.length
      image.restart()
      await image.requeue(now + 2_000)
      earlyAlarm = image.storage.alarmAt
      await image.tick(now + 2_000)
      afterEarly = fixture.boat.statusRequests.length
    }
  }
  await image.tick(now + 600_000)
  expect(await image.job()).toMatchObject({
    state: 'failed',
    phase: 'done',
    sandboxId: null,
  })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(alarms).toEqual([
    now + 1_000,
    now + 3_000,
    now + 7_000,
    now + 15_000,
    now + 31_000,
    now + 63_000,
    now + 123_000,
    now + 183_000,
    now + 243_000,
    now + 600_000,
  ])
  expect(afterEarly).toBe(beforeEarly)
  expect(earlyAlarm).toBe(now + 3_000)
  expect(fixture.boat.sandboxReads.length - reads).toBe(10)
  expect(fixture.boat.deadlineIds.length - deadlines).toBe(10)
})

it('keeps the original failure age when healthy running polls continue beyond the window', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture)
  const fault = statusFault(fixture)
  const now = fixture.runtime.dependencies.now()
  await image.tick(now)
  fault.recover()
  fixture.boat.commandRunning = true
  await image.tick(now + 1_000)
  image.restart()
  await image.tick(now + 610_000)
  expect(await image.job()).toMatchObject({
    state: 'running',
    phase: 'software',
  })
  fault.fail()
  await image.tick(now + 610_001)
  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'done' })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})

it('honors Retry-After and healthy progress while resetting the window only after image phase completion', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture)
  const fault = statusFault(fixture)
  const now = fixture.runtime.dependencies.now()
  fault.fail('4')
  await image.tick(now)
  expect(image.storage.alarmAt).toBe(now + 4_000)
  const calls = fixture.boat.statusRequests.length
  image.restart()
  await image.tick(now + 1_000)
  expect(fixture.boat.statusRequests).toHaveLength(calls)
  fault.recover()
  fixture.boat.commandRunning = true
  await image.tick(now + 4_000)
  expect(image.storage.alarmAt).toBe(now + 5_000)
  fault.fail()
  await image.tick(now + 5_000)
  expect(image.storage.alarmAt).toBe(now + 7_000)
  fault.recover()
  await image.tick(now + 7_000)
  await image.tick(now + 610_000)
  expect(await image.job()).toMatchObject({
    state: 'running',
    phase: 'software',
  })
  fixture.boat.commandRunning = false
  await image.tick(now + 610_001)
  expect(await image.job()).toMatchObject({ phase: 'install' })
  await image.tick(now + 610_002)
  fault.fail('5')
  await image.tick(now + 610_003)
  expect(await image.job()).toMatchObject({
    state: 'running',
    phase: 'install',
  })
  expect(image.storage.alarmAt).toBe(now + 615_003)
  fault.fail('601')
  await image.tick(now + 615_003)
  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'done' })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})
