import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { startImageBuild } from './image-builds'
import {
  buildStepStatements,
  closeJobStepsStatement,
  deleteOldJobRecords,
  jobRunStatement,
  startStepStatement,
  type JobRunRecord,
  type StartStepRecord,
} from './job-steps'
import { timedDatabase } from './timed-d1'

const fixtureForTest = setupBackendTests()

async function steps(db: D1Database, jobId: string) {
  return (
    await db
      .prepare(
        'SELECT step, job_kind AS kind, started_at AS startedAt, ended_at AS endedAt, outcome FROM job_steps WHERE job_id = ? ORDER BY started_at, step',
      )
      .bind(jobId)
      .all()
  ).results
}

it('opens each build step and closes the step before it, also on a replay', async () => {
  const { runtime, images, org, user } = await fixtureForTest()
  const db = runtime.env.DB
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: SOFTWARE,
  })
  await db.batch(buildStepStatements(db, id, ['phase:sources'], TEST_TIME))
  await db.batch(buildStepStatements(db, id, ['phase:software'], TEST_TIME + 5))
  await db.batch(buildStepStatements(db, id, ['phase:software'], TEST_TIME + 9))
  await db.batch([closeJobStepsStatement(db, id, TEST_TIME + 12, 'failed')])

  expect(await steps(db, id)).toEqual([
    {
      step: 'phase:sources',
      kind: 'refresh',
      startedAt: TEST_TIME,
      endedAt: TEST_TIME + 5,
      outcome: 'done',
    },
    {
      step: 'phase:software',
      kind: 'refresh',
      startedAt: TEST_TIME + 5,
      endedAt: TEST_TIME + 12,
      outcome: 'failed',
    },
  ])
})

it('writes no build step for a missing build and never fails the batch', async () => {
  const { runtime } = await fixtureForTest()
  const db = runtime.env.DB
  await db.batch(
    buildStepStatements(db, 'missing', ['phase:sources'], TEST_TIME),
  )
  expect(await steps(db, 'missing')).toEqual([])
})

it('keeps the first begin and the latest end of a start step', async () => {
  const { runtime, org } = await fixtureForTest()
  const db = runtime.env.DB
  const record: StartStepRecord = {
    jobId: 'attempt-1',
    jobKind: 'create',
    orgId: org.id,
    workspaceId: 'workspace-1',
    step: 'phase:fetch',
    startedAt: TEST_TIME + 2,
    endedAt: null,
    outcome: null,
    workerVersion: 'version-1',
  }
  await startStepStatement(db, record).run()
  await startStepStatement(db, {
    ...record,
    startedAt: TEST_TIME + 1,
    endedAt: TEST_TIME + 8,
    outcome: 'done',
  }).run()
  await startStepStatement(db, { ...record, startedAt: TEST_TIME + 3 }).run()
  await startStepStatement(db, { ...record, orgId: 'missing' }).run()

  expect(await steps(db, 'attempt-1')).toEqual([
    {
      step: 'phase:fetch',
      kind: 'create',
      startedAt: TEST_TIME + 1,
      endedAt: TEST_TIME + 8,
      outcome: 'done',
    },
  ])
})

it('keeps the first copy of a run and deletes records after 90 days', async () => {
  const { runtime, org } = await fixtureForTest()
  const db = runtime.env.DB
  const run: JobRunRecord = {
    jobId: 'attempt-1',
    runNumber: 1,
    jobKind: 'resume',
    orgId: org.id,
    workspaceId: 'workspace-1',
    phase: 'machine',
    dueAt: TEST_TIME,
    beganAt: TEST_TIME + 40,
    endedAt: TEST_TIME + 700,
    queueWaitMs: 3,
    queueRewaitMs: 4,
    providerCalls: 2,
    providerMs: 300,
    pollCalls: 0,
    pollMs: 0,
    d1Calls: 5,
    d1Ms: 60,
    slowestCall: 'provider.resume',
    slowestMs: 250,
    workerVersion: null,
  }
  await jobRunStatement(db, run).run()
  await jobRunStatement(db, { ...run, endedAt: TEST_TIME + 900 }).run()
  await jobRunStatement(db, { ...run, runNumber: 2, beganAt: 1 }).run()
  await startStepStatement(db, {
    jobId: 'old',
    jobKind: 'resume',
    orgId: org.id,
    workspaceId: 'workspace-1',
    step: 'phase:machine',
    startedAt: 1,
    endedAt: 2,
    outcome: 'done',
    workerVersion: null,
  }).run()

  await deleteOldJobRecords(db, 91 * 86_400_000)

  const runs = await db
    .prepare('SELECT run_number AS n, ended_at AS endedAt FROM job_runs')
    .all()
  expect(runs.results).toEqual([{ n: 1, endedAt: TEST_TIME + 700 }])
  expect(await steps(db, 'old')).toEqual([])
})

it('lets the plain binding batch a statement of a timed binding', async () => {
  const { runtime, org } = await fixtureForTest()
  const db = runtime.env.DB
  const names: string[] = []
  const timed = timedDatabase(db, {
    time: async (_kind, name, call) => {
      names.push(name)
      return await call()
    },
  })
  await db.batch([
    timed
      .prepare('UPDATE orgs SET name = ? WHERE id = ?')
      .bind('Renamed', org.id),
  ])
  expect(
    await timed
      .prepare('SELECT name FROM orgs WHERE id = ?')
      .bind(org.id)
      .first('name'),
  ).toBe('Renamed')
  expect(names).toEqual(['d1.first'])
})
