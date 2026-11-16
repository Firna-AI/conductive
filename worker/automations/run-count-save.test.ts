import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { automationPath } from '../../src/shared/automations'
import { createHarness, type TestHarness } from '../test-support/harness'
import { finishAutomationRun } from './run-outcome-data'
import { prepareAutomation } from './prepare-automation'
import { readAutomation } from './automation-data'
import { saveAutomation } from './automation-write-data'
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
  const previous = await readAutomation(db, org.id, 'automation-one')
  const edit = await prepareAutomation(
    runtime.env,
    org.id,
    user,
    { name: 'Renamed' },
    previous,
    runtime.dependencies,
  )
  for (const id of ['one', 'two', 'three']) {
    await fixture.seedRun(id)
    await finishAutomationRun(
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
  expect(await saveAutomation(db, edit, user.id, false)).toBe(true)
  expect(await readAutomation(db, org.id, 'automation-one')).toMatchObject({
    name: 'Renamed',
    active: false,
    failedRunsInARow: 3,
    inactiveReason: 'failed_runs',
    nextRunAt: null,
  })
  const enabled = await harness.request(
    automationPath(org.id, 'automation-one'),
    fixture.session,
    { method: 'PATCH', body: JSON.stringify({ active: true }) },
  )
  expect(enabled.status).toBe(200)
  expect(await enabled.json()).toMatchObject({
    automation: { active: true, inactiveReason: null, failedRunsInARow: 0 },
  })
})
