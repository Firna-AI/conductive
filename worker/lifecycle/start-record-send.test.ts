import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import type { DurableLifecycleState } from './durable-types'
import {
  nativeWorkspaceStorage,
  type WorkspaceStorage,
} from './platform-storage'
import { readSavedScript } from './saved-script'
import { StartJobRecords } from './start-job-records'
import { serializeStartJob } from './start-job-codec'
import { START_JOB_KEY } from './start-storage'
import type { WorkspaceStartJob } from './start-types'

const fixtureForTest = setupBackendTests()

function recordsFixture(name: string) {
  const fixture = fixtureForTest()
  const native = nativeWorkspaceStorage(
    fixture.harness.native.actor(name).api.storage,
  )
  const clock = { at: TEST_TIME }
  let loseTransaction = false
  const broken = { all: false }
  const refuse = () => Promise.reject(new Error('The storage is down.'))
  const storage: WorkspaceStorage = new Proxy(native, {
    get: (target, key) => {
      if (broken.all && ['get', 'put', 'delete', 'list'].includes(String(key)))
        return refuse
      if (key !== 'transaction') return Reflect.get(target, key)
      return (operation: Parameters<WorkspaceStorage['transaction']>[0]) => {
        if (broken.all) return refuse()
        if (!loseTransaction) return target.transaction(operation)
        loseTransaction = false
        return Promise.reject(new Error('The storage write was lost.'))
      }
    },
  })
  const job: WorkspaceStartJob = {
    providerAccount: 'boat',
    workspaceId: 'record-workspace',
    orgId: fixture.org.id,
    kind: 'resume',
    imageName: null,
    startupScript: readSavedScript(''),
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'record-turn',
    attempt: 'record-attempt',
    phase: 'machine',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  }
  const state: DurableLifecycleState = {
    workspaceId: job.workspaceId,
    orgId: job.orgId,
    state: 'starting',
    start: null,
    pendingFirstMessage: null,
    lastActivityAt: TEST_TIME,
    runningSessions: [],
    runnerConnected: false,
    stoppedAt: null,
    nextDiskKeepaliveAt: null,
    error: null,
  }
  const db = fixture.runtime.env.DB
  return {
    db,
    clock,
    job,
    state,
    storage,
    records: new StartJobRecords(fixture.runtime.env, storage, () => clock.at),
    loseNextTransaction: () => {
      loseTransaction = true
    },
    breakStorage: () => {
      broken.all = true
    },
    write: async (records: readonly D1PreparedStatement[]) => {
      if (records.length) await db.batch([...records])
    },
    steps: async (jobId = job.attempt) =>
      (
        await db
          .prepare(
            `SELECT step, started_at AS startedAt, ended_at AS endedAt, outcome
             FROM job_steps WHERE job_id = ? ORDER BY started_at, step`,
          )
          .bind(jobId)
          .all()
      ).results,
  }
}

it('repeats a send whose storage update was lost without a duplicate and keeps the first begin', async () => {
  const { records, clock, job, state, write, steps, loseNextTransaction } =
    recordsFixture('record-repeat')
  await records.jobBegan(job)
  clock.at = TEST_TIME + 5
  await records.phaseChanged(job, { ...job, phase: 'ready' })
  loseNextTransaction()
  await records.send(state, write)
  clock.at = TEST_TIME + 9
  await records.phaseChanged(
    { ...job, phase: 'ready' },
    { ...job, phase: 'startup' },
  )
  await records.send(state, write)

  expect(await steps()).toEqual([
    {
      step: 'phase:machine',
      startedAt: TEST_TIME,
      endedAt: TEST_TIME + 5,
      outcome: 'done',
    },
    {
      step: 'phase:ready',
      startedAt: TEST_TIME + 5,
      endedAt: TEST_TIME + 9,
      outcome: 'done',
    },
    {
      step: 'phase:startup',
      startedAt: TEST_TIME + 9,
      endedAt: null,
      outcome: null,
    },
  ])
})

it('saves the shown state alone and drops the rows when their batch fails', async () => {
  const { records, job, state, steps } = recordsFixture('record-refused')
  await records.jobBegan(job)
  const writes: number[] = []
  await expect(
    records.send(state, async (statements) => {
      writes.push(statements.length)
      if (statements.length) throw new Error('D1 refused the batch.')
    }),
  ).resolves.toBeUndefined()
  await records.send(state, async (statements) => {
    writes.push(statements.length)
  })

  expect(writes).toEqual([1, 0, 0])
  expect(await steps()).toEqual([])
})

it('sends at most 50 rows in one batch', async () => {
  const { db, records, job, state, storage, write } =
    recordsFixture('record-limit')
  await storage.put('job', START_JOB_KEY, serializeStartJob(job))
  await records.jobBegan(job)
  for (let run = 0; run < 60; run++)
    await (await records.begin(TEST_TIME)).end()
  const sizes: number[] = []
  const counted = async (statements: readonly D1PreparedStatement[]) => {
    sizes.push(statements.length)
    await write(statements)
  }
  await records.send(state, counted)
  await records.send(state, counted)

  expect(sizes).toEqual([50, 11])
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM job_runs WHERE job_id = ?')
      .bind(job.attempt)
      .first('count'),
  ).toBe(60)
})

it('lets every start hook finish and still saves the shown state when the record storage fails', async () => {
  const { records, job, state, breakStorage } = recordsFixture('record-down')
  breakStorage()
  await expect(records.jobBegan(job)).resolves.toBeUndefined()
  await expect(
    records.phaseChanged(job, { ...job, phase: 'ready' }),
  ).resolves.toBeUndefined()
  const run = await records.begin(TEST_TIME)
  await expect(run.end()).resolves.toBeUndefined()
  await expect(records.jobEnded(job, 'failed')).resolves.toBeUndefined()
  const writes: number[] = []
  await records.send(state, async (statements) => {
    writes.push(statements.length)
  })

  expect(writes).toEqual([0])
})

it('gives a continued create its own records and closes the steps of the try that it replaces', async () => {
  const { records, clock, job, state, storage, write, steps } =
    recordsFixture('record-continued')
  const create: WorkspaceStartJob = { ...job, kind: 'resume' }
  await records.jobBegan(create)
  clock.at = TEST_TIME + 5
  const continued = { ...create, commandAttempt: 'record-attempt:restore:1' }
  await storage.put('job', START_JOB_KEY, serializeStartJob(continued))
  await records.jobBegan(continued)
  await (await records.begin(TEST_TIME + 5)).end()
  await records.send(state, write)
  await records.send(state, write)
  clock.at = TEST_TIME + 8
  await records.jobEnded(continued, 'done')
  await records.send(state, write)

  expect(await steps()).toEqual([
    {
      step: 'phase:machine',
      startedAt: TEST_TIME,
      endedAt: TEST_TIME + 5,
      outcome: 'failed',
    },
  ])
  expect(await steps('record-attempt:restore:1')).toEqual([
    {
      step: 'phase:machine',
      startedAt: TEST_TIME + 5,
      endedAt: TEST_TIME + 8,
      outcome: 'done',
    },
  ])
})

it('closes the open steps as failed when the start job goes without an end', async () => {
  const { records, clock, job, storage, steps } =
    recordsFixture('record-suspended')
  await storage.put('job', START_JOB_KEY, serializeStartJob(job))
  await records.jobBegan(job)
  const run = await records.begin(TEST_TIME)
  await storage.delete(START_JOB_KEY)
  clock.at = TEST_TIME + 7
  await run.end()

  expect(await steps()).toEqual([
    {
      step: 'phase:machine',
      startedAt: TEST_TIME,
      endedAt: TEST_TIME + 7,
      outcome: 'failed',
    },
  ])
})
