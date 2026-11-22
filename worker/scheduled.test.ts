import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createApp } from './application'
import { cleanupDeletedOrgs } from './members/cleanup'
import { repairLifecycleAlarms } from './lifecycle/repair'
import { retryApprovalEmails } from './operator/approval-email'
import * as recordCleanups from './record-cleanups'
import { repairSoftwareImages } from './software-image/repair'
import { scanAutomationSchedules } from './automations/schedule-scan'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from './test-support/harness'

vi.mock('./members/cleanup', () => ({ cleanupDeletedOrgs: vi.fn() }))
vi.mock('./lifecycle/repair', () => ({ repairLifecycleAlarms: vi.fn() }))
vi.mock('./operator/approval-email', () => ({ retryApprovalEmails: vi.fn() }))
vi.mock('./software-image/repair', () => ({ repairSoftwareImages: vi.fn() }))
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
beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.restoreAllMocks())

it.each([
  {
    step: 'record cleanups',
    kind: 'record_cleanup_failed',
    message: 'Record cleanup failed. It runs again at the next timer.',
  },
  {
    step: 'deleted org purge',
    kind: 'org_cleanup_failed',
    message: 'Deleted-org cleanup will retry.',
  },
  {
    step: 'lifecycle alarm repair',
    kind: 'lifecycle_alarm_repair_failed',
    message: 'Lifecycle alarm repair failed. It runs again at the next timer.',
  },
  {
    step: 'software image repair',
    kind: 'software_image_repair_failed',
    message: 'Software image repair failed. It runs again at the next timer.',
  },
  {
    step: 'approval email retry',
    kind: 'approval_email_retry_failed',
    message:
      'The retry of approval emails failed. It runs again at the next timer.',
  },
])('warns once and keeps cron order when $step fails', async (failure) => {
  const calls: string[] = []
  const run = (step: string) => {
    calls.push(step)
    if (step === failure.step) throw new Error('Private cron error marker')
  }
  vi.spyOn(recordCleanups, 'runRecordCleanups').mockImplementation(async () =>
    run('record cleanups'),
  )
  vi.mocked(cleanupDeletedOrgs).mockImplementation(async () => {
    run('deleted org purge')
    return { purged: [], pending: [] }
  })
  vi.mocked(repairLifecycleAlarms).mockImplementation(async () => {
    run('lifecycle alarm repair')
    return {
      workspaces: 0,
      orgs: 0,
      pendingWorkspaces: 0,
      pendingOrgs: 0,
    }
  })
  vi.mocked(repairSoftwareImages).mockImplementation(async () =>
    run('software image repair'),
  )
  vi.mocked(retryApprovalEmails).mockImplementation(async () =>
    run('approval email retry'),
  )
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await expect(
    createApp({ now: () => TEST_TIME }).scheduled(
      { cron: '*/15 * * * *', scheduledTime: TEST_TIME, noRetry() {} },
      harness.env,
    ),
  ).resolves.toBeUndefined()
  expect(calls).toEqual([
    'record cleanups',
    'deleted org purge',
    'lifecycle alarm repair',
    'software image repair',
    'approval email retry',
  ])
  expect(warn.mock.calls).toEqual([
    [{ kind: failure.kind, message: failure.message }],
  ])
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

it('deletes job step records older than 90 days in the 15-minute maintenance', async () => {
  const app = createApp({ now: () => TEST_TIME })
  const db = harness.env.DB
  const old = TEST_TIME - 90 * 86_400_000 - 1
  const kept = TEST_TIME - 89 * 86_400_000
  await db.batch(
    [
      ['old-job', old],
      ['kept-job', kept],
    ].flatMap(([jobId, at]) => [
      db
        .prepare(
          `INSERT INTO job_steps (job_id, step, job_kind, org_id, started_at)
           VALUES (?, 'phase:machine', 'resume', 'org', ?)`,
        )
        .bind(jobId, at),
      db
        .prepare(
          `INSERT INTO job_runs (job_id, run_number, job_kind, org_id, phase, began_at, ended_at)
           VALUES (?, 1, 'resume', 'org', 'machine', ?, ?)`,
        )
        .bind(jobId, at, at),
    ]),
  )
  await app.scheduled(
    { cron: '*/15 * * * *', scheduledTime: TEST_TIME, noRetry() {} },
    harness.env,
  )
  const left = await db
    .prepare(
      'SELECT job_id AS id FROM job_steps UNION ALL SELECT job_id AS id FROM job_runs',
    )
    .all<{ id: string }>()
  expect(left.results.map((row) => row.id)).toEqual(['kept-job', 'kept-job'])
})
