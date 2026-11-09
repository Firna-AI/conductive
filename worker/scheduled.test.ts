import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import { createApp } from './application'
import { cleanupDeletedOrgs } from './members/cleanup'
import { scanRoutineSchedules } from './routines/schedule-scan'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from './test-support/harness'

vi.mock('./members/cleanup', () => ({ cleanupDeletedOrgs: vi.fn() }))
vi.mock('./routines/schedule-scan', () => ({ scanRoutineSchedules: vi.fn() }))

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('dispatches the minute scan separately from the 15-minute deleted-org cleanup', async () => {
  const app = createApp({ now: () => TEST_TIME })
  const scheduled = (cron: string) =>
    app.scheduled({ cron, scheduledTime: TEST_TIME, noRetry() {} }, harness.env)
  await scheduled('* * * * *')
  expect(scanRoutineSchedules).toHaveBeenCalledTimes(1)
  expect(cleanupDeletedOrgs).not.toHaveBeenCalled()
  expect(
    vi.mocked(scanRoutineSchedules).mock.calls[0][0].dependencies.now(),
  ).toBe(TEST_TIME)
  await scheduled('*/15 * * * *')
  expect(cleanupDeletedOrgs).toHaveBeenCalledTimes(1)
  expect(scanRoutineSchedules).toHaveBeenCalledTimes(1)
  await scheduled('0 * * * *')
  expect(cleanupDeletedOrgs).toHaveBeenCalledTimes(1)
  expect(scanRoutineSchedules).toHaveBeenCalledTimes(1)
})
