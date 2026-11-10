import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { pullRequestFixture } from './pull-request.test-support'
import { scanRoutineSchedules } from './schedule-scan'

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

it('recovers a stored pull request through the minute scan when its background task did not start', async () => {
  const h = await pullRequestFixture(harness)
  expect((await h.request(h.payload())).status).toBe(204)
  expect((await h.rows()).results.map((row) => row.state)).toEqual(['queued'])
  expect(h.boat.starts).toEqual([])
  h.setTime(TEST_TIME + 60_001)
  await h.run(() => scanRoutineSchedules(h.runtime))
  expect((await h.rows()).results.map((row) => row.state)).toEqual(['started'])
  expect(
    await h.db
      .prepare(
        'SELECT base_branch AS branch, start_sha AS sha FROM workspace_creation_plans',
      )
      .first(),
  ).toEqual({
    branch: 'changes',
    sha: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
  })
  await h.run(() => Promise.all(h.background.map((start) => start())))
  expect(
    await h.db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(1)
})
