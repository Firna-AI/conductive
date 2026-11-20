import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { refuseAction } from './background-retry.test-support'
import {
  retentionDates,
  stoppedRetentionFixture,
} from './retention-dates-test-support'

const fixtureForTest = setupBackendTests()
const due = TEST_TIME + 1_123_200_000

it('keeps six refused RESUMEs through unrenewed cleanup and clears the chain on real renewal', async () => {
  const fixture = await stoppedRetentionFixture(fixtureForTest())
  const fault = refuseAction(fixture, 'resume', 'bx_1')
  for (const offset of [0, 30_000, 90_000, 210_000, 450_000, 930_000])
    await fixture.tick(due + offset)
  expect((await fixture.platform.endpoint().readLifecycle())?.retry).toEqual({
    failures: 6,
    at: due + 1_890_000,
  })
  await fixture.tick(due + 1_200_000)
  expect(fault.calls()).toBe(6)
  expect(fault.reads()).toBe(6)
  await fixture.runtime.env.DB.prepare(
    `CREATE TRIGGER fail_unrenewed_publication BEFORE UPDATE OF state ON workspaces
     BEGIN SELECT RAISE(ABORT, 'unrenewed publication failed'); END`,
  ).run()
  await fixture.tick(due + 1_890_000)
  expect(await fixture.progress()).toBeNull()
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: TEST_TIME,
    nextDiskKeepaliveAt: due,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
    retry: { failures: 6, at: due + 1_895_000 },
  })
  expect(fault.calls()).toBe(6)
  expect(fault.reads()).toBe(7)
  await fixture.runtime.env.DB.prepare(
    'DROP TRIGGER fail_unrenewed_publication',
  ).run()
  await fixture.platform.restart()
  await fixture.tick(due + 1_894_999)
  expect(fault.calls()).toBe(6)
  expect(fault.reads()).toBe(7)
  fixture.boat.states.set('bx_1', 'archiving')
  await fixture.tick(due + 1_895_000)
  expect((await fixture.platform.endpoint().readLifecycle())?.retry).toEqual({
    failures: 6,
    at: due + 1_900_000,
  })
  expect(fault.calls()).toBe(6)
  expect(fault.reads()).toBe(8)
  fixture.boat.states.set('bx_1', 'archived')
  await fixture.tick(due + 1_900_000)
  expect(fault.calls()).toBe(7)
  expect(fault.reads()).toBe(9)
  expect((await fixture.platform.endpoint().readLifecycle())?.retry).toEqual({
    failures: 7,
    at: due + 3_820_000,
  })
  await fixture.platform.restart()
  await fixture.tick(due + 3_095_000)
  expect(fault.calls()).toBe(7)
  expect(fault.reads()).toBe(9)
  await fixture.tick(due + 3_820_000)
  expect((await fixture.platform.endpoint().readLifecycle())?.retry).toEqual({
    failures: 7,
    at: due + 3_825_000,
  })
  expect(await retentionDates(fixture, fixture.id)).toEqual({
    stoppedAt: TEST_TIME,
    nextDiskKeepaliveAt: due,
  })
  expect(fixture.boat.stopIds).toEqual([])
  fault.succeed()
  await fixture.tick(due + 3_825_000)
  expect(fault.calls()).toBe(8)
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  expect(
    (await fixture.platform.endpoint().readLifecycle())?.retry,
  ).toBeUndefined()
  for (const offset of [3_830_000, 3_835_000, 3_840_000, 3_845_000])
    await fixture.tick(due + offset)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(await fixture.platform.endpoint().readLifecycle()).toMatchObject({
    stoppedAt: due + 3_845_000,
    nextDiskKeepaliveAt: TEST_TIME + 2_250_245_000,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
    retry: undefined,
  })
  expect(await retentionDates(fixture, fixture.id)).toEqual({
    stoppedAt: due + 3_845_000,
    nextDiskKeepaliveAt: TEST_TIME + 2_250_245_000,
  })
  expect(await fixture.progress()).toBeNull()
})
