import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import { createApp } from './application'
import { cleanupDeletedOrgs } from './members/cleanup'
import { repairLifecycleAlarms } from './lifecycle/repair'
import { retryApprovalEmails } from './operator/approval-email'
import { scanAutomationSchedules } from './automations/schedule-scan'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from './test-support/harness'

vi.mock('./members/cleanup', () => ({ cleanupDeletedOrgs: vi.fn() }))
vi.mock('./lifecycle/repair', () => ({ repairLifecycleAlarms: vi.fn() }))
vi.mock('./operator/approval-email', () => ({ retryApprovalEmails: vi.fn() }))
vi.mock('./automations/schedule-scan', () => ({
  scanAutomationSchedules: vi.fn(),
}))

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('dispatches the minute scan separately from all 15-minute maintenance and ignores unconfigured crons', async () => {
  const app = createApp({ now: () => TEST_TIME })
  const scheduled = (cron: string) =>
    app.scheduled({ cron, scheduledTime: TEST_TIME, noRetry() {} }, harness.env)
  await scheduled('* * * * *')
  expect(scanAutomationSchedules).toHaveBeenCalledTimes(1)
  expect(cleanupDeletedOrgs).not.toHaveBeenCalled()
  expect(repairLifecycleAlarms).not.toHaveBeenCalled()
  expect(retryApprovalEmails).not.toHaveBeenCalled()
  expect(
    vi.mocked(scanAutomationSchedules).mock.calls[0][0].dependencies.now(),
  ).toBe(TEST_TIME)
  await scheduled('*/15 * * * *')
  expect(cleanupDeletedOrgs).toHaveBeenCalledTimes(1)
  expect(repairLifecycleAlarms).toHaveBeenCalledTimes(1)
  expect(retryApprovalEmails).toHaveBeenCalledTimes(1)
  expect(scanAutomationSchedules).toHaveBeenCalledTimes(1)
  await scheduled('0 * * * *')
  expect(cleanupDeletedOrgs).toHaveBeenCalledTimes(1)
  expect(repairLifecycleAlarms).toHaveBeenCalledTimes(1)
  expect(retryApprovalEmails).toHaveBeenCalledTimes(1)
  expect(scanAutomationSchedules).toHaveBeenCalledTimes(1)
})
