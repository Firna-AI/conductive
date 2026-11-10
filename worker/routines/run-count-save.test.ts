import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { routinePath } from '../../src/shared/routines'
import { createHarness, type TestHarness } from '../test-support/harness'
import { finishRoutineRun } from './run-outcome-data'
import { prepareRoutine } from './prepare-routine'
import { readRoutine } from './routine-data'
import { saveRoutine } from './routine-write-data'
import { runFixture } from './runs.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps failures and automatic turn-off committed during an edit and resets the count on owner activation', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user } = fixture
  const db = runtime.env.DB
  const previous = await readRoutine(db, org.id, 'routine-one')
  const edit = await prepareRoutine(
    runtime.env,
    org.id,
    user,
    { name: 'Renamed' },
    previous,
    runtime.dependencies,
  )
  for (const id of ['one', 'two', 'three']) {
    await fixture.seedRun(id)
    await finishRoutineRun(
      db,
      org.id,
      id,
      {
        state: 'failed',
        error: { code: 'agent_unavailable', message: 'Try again.' },
      },
      runtime.dependencies.now(),
    )
  }
  expect(await saveRoutine(db, edit, user.id, false)).toBe(true)
  expect(await readRoutine(db, org.id, 'routine-one')).toMatchObject({
    name: 'Renamed',
    active: false,
    failedRunsInARow: 3,
    inactiveReason: 'failed_runs',
    nextRunAt: null,
  })
  const enabled = await harness.request(
    routinePath(org.id, 'routine-one'),
    fixture.session,
    { method: 'PATCH', body: JSON.stringify({ active: true }) },
  )
  expect(enabled.status).toBe(200)
  expect(await enabled.json()).toMatchObject({
    routine: { active: true, inactiveReason: null, failedRunsInARow: 0 },
  })
})
