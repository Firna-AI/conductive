import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceToRunner, resumedStartup } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

interface StepRow {
  step: string
  startedAt: number
  endedAt: number | null
  outcome: string | null
}

interface RunRow {
  runNumber: number
  phase: string
  dueAt: number | null
  beganAt: number
  endedAt: number
  queueWaitMs: number
  queueRewaitMs: number
  providerCalls: number
  providerMs: number
  pollCalls: number
  pollMs: number
  d1Calls: number
  d1Ms: number
  slowestCall: string | null
  slowestMs: number | null
}

const CREATE_PHASES = [
  'records',
  'machine',
  'ready',
  'fetch',
  'branch',
  'startup',
  'terminal',
  'terminal-password',
  'runner',
]

async function jobKinds(db: D1Database, jobId: string) {
  return (
    await db
      .prepare(
        `SELECT job_kind AS kind FROM job_steps WHERE job_id = ?1
         UNION SELECT job_kind FROM job_runs WHERE job_id = ?1`,
      )
      .bind(jobId)
      .all<{ kind: string }>()
  ).results.map((row) => row.kind)
}

async function jobSteps(db: D1Database, jobId: string) {
  const rows = await db
    .prepare(
      `SELECT step, started_at AS startedAt, ended_at AS endedAt, outcome
       FROM job_steps WHERE job_id = ? ORDER BY started_at, step`,
    )
    .bind(jobId)
    .all<StepRow>()
  return new Map(rows.results.map((row) => [row.step, row]))
}

async function jobRuns(db: D1Database, jobId: string) {
  return (
    await db
      .prepare(
        `SELECT run_number AS runNumber, phase, due_at AS dueAt, began_at AS beganAt,
           ended_at AS endedAt, queue_wait_ms AS queueWaitMs,
           queue_rewait_ms AS queueRewaitMs, provider_calls AS providerCalls,
           provider_ms AS providerMs, poll_calls AS pollCalls, poll_ms AS pollMs,
           d1_calls AS d1Calls, d1_ms AS d1Ms, slowest_call AS slowestCall,
           slowest_ms AS slowestMs
         FROM job_runs WHERE job_id = ? ORDER BY run_number`,
      )
      .bind(jobId)
      .all<RunRow>()
  ).results
}

/** Each phase begins when the phase before it ends. */
function phaseGaps(steps: Map<string, StepRow>, phases: readonly string[]) {
  const rows = phases.map((phase) => steps.get(`phase:${phase}`))
  return rows
    .slice(1)
    .map((row, index) => [
      phases[index + 1],
      (row?.startedAt ?? NaN) - (rows[index]?.endedAt ?? NaN),
    ])
}

/** The runs of a start are numbered from 1, and each holds ordered times and counts. */
function expectRuns(runs: RunRow[]) {
  expect(runs.map((run) => run.runNumber)).toEqual(
    runs.map((_run, index) => index + 1),
  )
  for (const run of runs) {
    const counts = [
      run.queueWaitMs,
      run.queueRewaitMs,
      run.providerCalls,
      run.providerMs,
      run.pollCalls,
      run.pollMs,
      run.d1Ms,
      run.slowestMs ?? NaN,
    ]
    expect(
      counts.every((count) => count >= 0),
      `run ${run.runNumber}`,
    ).toBe(true)
    expect(run.d1Calls, `run ${run.runNumber}`).toBeGreaterThan(0)
    expect(run.dueAt ?? NaN, `run ${run.runNumber}`).toBeLessThanOrEqual(
      run.beganAt,
    )
    expect(run.beganAt, `run ${run.runNumber}`).toBeLessThanOrEqual(run.endedAt)
    expect(run.slowestCall, `run ${run.runNumber}`).toMatch(
      /^(?:(d1|provider)\.[A-Za-z]+|host\.(runCommand|startCommand|getCommandStatus))$/,
    )
  }
}

it('records the steps and runs of a create with ordered, closed times', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat } = fixture
  let started = false
  boat.beforeCommand = async (_command, detached) => {
    if (started || !detached) return
    started = true
    await fixture.setTime(runtime.dependencies.now() + 125)
  }
  let held = false
  boat.beforeStatus = async () => {
    if (held) return
    held = true
    await fixture.setTime(runtime.dependencies.now() + 250)
  }
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: structuredClone(FIRST_MESSAGE),
    }),
  )
  const accepted = fixture.starts.get(created.workspace.id)?.lastAccepted()
  if (!accepted) throw new Error('The create job is missing.')
  const db = runtime.env.DB
  const steps = await jobSteps(db, accepted.attempt)
  const runs = await jobRuns(db, accepted.attempt)

  expect(await jobKinds(db, accepted.attempt)).toEqual(['create'])
  expect([...steps.keys()].sort()).toEqual(
    [
      ...CREATE_PHASES.map((phase) => `phase:${phase}`),
      'computer:request',
      'computer:boot',
      'step:image',
      'step:fetch',
      'step:branch',
      'step:startup',
      'step:runner',
    ].sort(),
  )
  expect(
    [...steps.values()].filter(
      (row) =>
        row.outcome !== 'done' ||
        row.endedAt === null ||
        row.endedAt < row.startedAt,
    ),
  ).toEqual([])
  expect(phaseGaps(steps, CREATE_PHASES)).toEqual(
    CREATE_PHASES.slice(1).map((phase) => [phase, 0]),
  )
  const request = steps.get('computer:request')
  const boot = steps.get('computer:boot')
  const machine = steps.get('phase:machine')
  const ready = steps.get('phase:ready')
  expect(request?.startedAt).toBeGreaterThanOrEqual(machine?.startedAt ?? NaN)
  expect(request?.endedAt).toBeLessThanOrEqual(machine?.endedAt ?? NaN)
  expect(boot?.startedAt).toBe(request?.endedAt)
  expect(boot?.endedAt).toBeGreaterThanOrEqual(ready?.startedAt ?? NaN)
  expect(boot?.endedAt).toBeLessThanOrEqual(ready?.endedAt ?? NaN)
  expectRuns(runs)
  expect(runs[0]).toMatchObject({ phase: 'records', providerCalls: 0 })
  expect(
    runs.find((run) => run.phase === 'machine')?.providerCalls,
  ).toBeGreaterThan(0)
  const polled = runs.find((run) => run.pollCalls > 0)
  expect(polled).toMatchObject({
    pollMs: 250,
    slowestCall: 'host.getCommandStatus',
    slowestMs: 250,
  })
  expect((polled?.endedAt ?? 0) - (polled?.beganAt ?? 0)).toBe(250)
  expect(
    runs.find((run) => run.slowestCall === 'host.startCommand'),
  ).toMatchObject({
    providerMs: 125,
    slowestMs: 125,
  })
})

it('records the steps and runs of a resume with its own job kind', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  await advanceToRunner(start)
  await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(fixture.runtime.dependencies.now() + 1_000)
  expect(await start.wait()).toEqual({ ok: true })
  const db = fixture.runtime.env.DB
  const steps = await jobSteps(db, 'resume-under-test')

  expect(await jobKinds(db, 'resume-under-test')).toEqual(['resume'])
  expect([...steps.keys()].sort()).toEqual(
    [
      'phase:machine',
      'phase:ready',
      'phase:startup',
      'phase:terminal',
      'phase:terminal-password',
      'phase:runner',
      'computer:request',
      'computer:boot',
      'step:disk',
      'step:startup',
      'step:runner',
    ].sort(),
  )
  expect(
    [...steps.values()].filter(
      (row) => row.outcome !== 'done' || row.endedAt === null,
    ),
  ).toEqual([])
  expectRuns(await jobRuns(db, 'resume-under-test'))
})

it('closes the open phase of a failed create as failed', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat } = fixture
  boat.commandExitCode = 1
  await expect(
    fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: structuredClone(FIRST_MESSAGE),
      }),
    ),
  ).rejects.toMatchObject({ code: 'workspace_start_failed' })
  const accepted = fixture.starts.get('lifecycle-1')?.lastAccepted()
  if (!accepted) throw new Error('The create job is missing.')
  const steps = await jobSteps(runtime.env.DB, accepted.attempt)

  expect(
    [...steps.values()]
      .filter((row) => row.step.startsWith('phase:'))
      .map((row) => [row.step, row.outcome, row.endedAt !== null])
      .sort(),
  ).toEqual([
    ['phase:fetch', 'failed', true],
    ['phase:machine', 'done', true],
    ['phase:ready', 'done', true],
    ['phase:records', 'done', true],
  ])
  expect(steps.get('step:fetch')).toMatchObject({ outcome: 'failed' })
  expectRuns(await jobRuns(runtime.env.DB, accepted.attempt))
})
