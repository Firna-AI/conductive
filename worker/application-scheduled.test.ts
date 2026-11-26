import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createApp } from './application'
import { SOFTWARE } from './lifecycle/backend-test-support'
import { withSoftwareRelease } from './lifecycle/software-release-test-support'
import { readBuildHistory } from './lifecycle/build-data'
import { heldOperation } from './test-support/held-operation'
import {
  realRuntimeFixture,
  runtimeBundle,
} from './lifecycle/real-runtime-test-support'
import { workspaceRuntime } from './lifecycle/runtime'
import { liftOrgSuspension } from './operator/lift'
import { suspendOrg } from './operator/suspend-org'
import { DEFAULT_PROVIDER_ACCOUNT } from './sandbox/account-identity'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fixture.dispose()
})

const event: ScheduledController = {
  cron: '*/15 * * * *',
  scheduledTime: 0,
  noRetry() {},
}

it.each([
  {
    step: 'feedback sends',
    query: 'DELETE FROM feedback_sends',
    kind: 'feedback_send_cleanup_failed',
    message:
      'Feedback send record cleanup failed. It runs again at the next timer.',
    remaining: [],
  },
  {
    step: 'Codex devices',
    query: 'DELETE FROM codex_devices',
    kind: 'codex_device_cleanup_failed',
    message: 'Codex device cleanup failed. It runs again at the next timer.',
    remaining: [],
  },
  {
    step: 'job records',
    query: 'DELETE FROM job_steps',
    kind: 'job_record_cleanup_failed',
    message:
      'The deletion of old job step records failed. It runs again at the next timer.',
    remaining: ['expired-job', 'expired-job'],
  },
])(
  'continues maintenance and warns once when $step cleanup fails',
  async (failure) => {
    const now = Date.now()
    const db = fixture.env.DB
    const old = now - 90 * 86_400_000 - 1
    await db.batch([
      db
        .prepare(
          `INSERT INTO job_steps (job_id, step, job_kind, org_id, started_at)
         VALUES ('expired-job', 'phase:machine', 'resume', 'runtime-org', ?)`,
        )
        .bind(old),
      db
        .prepare(
          `INSERT INTO job_runs (job_id, run_number, job_kind, org_id, phase, began_at, ended_at)
         VALUES ('expired-job', 1, 'resume', 'runtime-org', 'machine', ?, ?)`,
        )
        .bind(old, old),
    ])
    const queries = [
      ['DELETE FROM feedback_sends', 'feedback sends'],
      ['DELETE FROM codex_devices', 'Codex devices'],
      ['DELETE FROM job_steps', 'job records'],
      ['purge_after AS deletesAt', 'deleted org purge'],
      ['SELECT w.id FROM workspaces w WHERE', 'lifecycle alarm repair'],
      ['SELECT DISTINCT provider_account AS account', 'software image repair'],
      ["FROM approval_emails WHERE state = 'pending'", 'approval email retry'],
    ] as const
    const calls: string[] = []
    const failing = new Proxy(db, {
      get(target, property, receiver) {
        if (property !== 'prepare')
          return Reflect.get(target, property, receiver)
        return (sql: string) => {
          const step = queries.find(([query]) => sql.includes(query))?.[1]
          if (step) calls.push(step)
          if (sql.includes(failure.query))
            throw new Error('Private cleanup error marker')
          return target.prepare(sql)
        }
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      createApp({
        now: () => now,
        fetch: withSoftwareRelease(fixture.boat.fetch),
      }).scheduled(event, { ...fixture.env, DB: failing }),
    ).resolves.toBeUndefined()
    expect(calls).toEqual([
      'feedback sends',
      'Codex devices',
      'job records',
      'deleted org purge',
      'lifecycle alarm repair',
      'software image repair',
      'approval email retry',
    ])
    const left = await db
      .prepare(
        'SELECT job_id AS id FROM job_steps UNION ALL SELECT job_id AS id FROM job_runs',
      )
      .all<{ id: string }>()
    expect(left.results.map((row) => row.id)).toEqual(failure.remaining)
    expect(warn.mock.calls).toEqual([
      [{ kind: failure.kind, message: failure.message }],
    ])
  },
)

it('starts a lifted org daily refresh at the next scheduled repair', async () => {
  const runtime = workspaceRuntime(fixture.env)
  const now = Date.now() - 1_000
  await suspendOrg(runtime, 'runtime-org', 'runtime-user')
  await fixture.env.DB.prepare(
    'UPDATE org_images SET next_image_refresh_at = ? WHERE org_id = ? AND provider_account = ?',
  )
    .bind(now - 15 * 60 * 1_000 - 1, 'runtime-org', DEFAULT_PROVIDER_ACCOUNT)
    .run()
  const coordinator = fixture.actor('org-image:runtime-org')
  await coordinator.scheduleImage({
    orgId: 'runtime-org',
    software: SOFTWARE,
    buildId: null,
    nextAt: 0,
  })
  expect(await coordinator.alarmAt()).toBeNull()
  await liftOrgSuspension(runtime, 'runtime-org', 'runtime-user')
  expect(await coordinator.alarmAt()).toBeNull()
  const created = heldOperation()
  const fetch = fixture.boat.fetch
  let first = true
  fixture.boat.fetch = async (request) => {
    const response = await fetch(request)
    if (first) {
      first = false
      await created.wait()
    }
    return response
  }
  const application = createApp({
    now: () => now,
    fetch: withSoftwareRelease(fixture.boat.fetch),
  })
  await application.scheduled(event, fixture.env)
  const advancing = coordinator.tick()
  try {
    expect((await coordinator.imageSchedule())?.orgId).toBe('runtime-org')
    await created.entered
    const refresh = (await readBuildHistory(fixture.env.DB, 'runtime-org'))
      .builds[0]
    expect(refresh).toMatchObject({ kind: 'refresh', state: 'running' })
    const next = await fixture.env.DB.prepare(
      'SELECT next_image_refresh_at FROM org_images WHERE org_id = ? AND provider_account = ?',
    )
      .bind('runtime-org', DEFAULT_PROVIDER_ACCOUNT)
      .first('next_image_refresh_at')
    const schedule = await coordinator.imageSchedule()
    if (!schedule) throw new Error('Missing repaired image schedule')
    expect(next).toBe(refresh.startedAt + 86_400_000)
    expect(schedule.buildId).not.toBeNull()
    const builds = await readBuildHistory(fixture.env.DB, 'runtime-org')
    await application.scheduled(event, fixture.env)
    expect(await readBuildHistory(fixture.env.DB, 'runtime-org')).toEqual(
      builds,
    )
  } finally {
    created.release()
    await advancing
  }
})

it('leaves stored deadlines and image state unchanged when no repair is overdue', async () => {
  await fixture.env.DB.prepare(
    'UPDATE org_images SET next_image_refresh_at = ? WHERE org_id = ? AND provider_account = ?',
  )
    .bind(Date.now() + 86_400_000, 'runtime-org', DEFAULT_PROVIDER_ACCOUNT)
    .run()
  const before = await fixture.env.DB.prepare(
    'SELECT next_image_refresh_at FROM org_images WHERE org_id = ? AND provider_account = ?',
  )
    .bind('runtime-org', DEFAULT_PROVIDER_ACCOUNT)
    .first('next_image_refresh_at')
  await createApp().scheduled(event, fixture.env)
  expect(
    await fixture.env.DB.prepare(
      'SELECT next_image_refresh_at FROM org_images WHERE org_id = ? AND provider_account = ?',
    )
      .bind('runtime-org', DEFAULT_PROVIDER_ACCOUNT)
      .first('next_image_refresh_at'),
  ).toBe(before)
  const coordinator = fixture.actor('org-image:runtime-org')
  expect(await coordinator.imageSchedule()).toBeUndefined()
  expect(await coordinator.alarmAt()).toBeNull()
  expect(fixture.requests).toEqual([])
})

it('warns and finishes the scheduled repairs when the approval email retry fails', async () => {
  const db = fixture.env.DB
  const failing = new Proxy(db, {
    get(target, property, receiver) {
      if (property !== 'prepare') return Reflect.get(target, property, receiver)
      return (sql: string) => {
        if (sql.includes('approval_emails'))
          throw new Error('approval emails are not readable')
        return target.prepare(sql)
      }
    },
  })
  const warnings: unknown[] = []
  const warn = console.warn
  console.warn = (message: unknown) => warnings.push(message)
  try {
    await expect(
      createApp().scheduled(event, { ...fixture.env, DB: failing }),
    ).resolves.toBeUndefined()
  } finally {
    console.warn = warn
  }
  expect(warnings).toEqual([
    {
      kind: 'approval_email_retry_failed',
      message:
        'The retry of approval emails failed. It runs again at the next timer.',
    },
  ])
})
