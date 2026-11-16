import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { HEAD_SHA, repositoryPull } from '../github/fake-pull'
import { createHarness, type TestHarness } from '../test-support/harness'
import { storeContinuedBranch } from './continue-data'
import { continueFixture } from './continue.test-support'
import { continueJobKey, type ContinueJob } from './continue-types'

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

it('gives each Continue the next version of the workspace name once', async () => {
  const f = await continueFixture(harness)
  const db = f.env.DB
  const stored = () =>
    db
      .prepare(
        'SELECT branch, task_number AS task FROM workspaces WHERE id = ?',
      )
      .bind(WORKSPACE_ID)
      .first<{ branch: string; task: number }>()
  const merge = () =>
    db
      .prepare(
        "UPDATE workspaces SET name = 'Saved carts', github_summary = 'merged' WHERE id = ?",
      )
      .bind(WORKSPACE_ID)
      .run()
  const continueOnce = async (expectedBranch: string, pull: number) => {
    await merge()
    f.api.branches.set(`refs/heads/${expectedBranch}`, HEAD_SHA)
    f.api.pulls[pull] = repositoryPull({
      number: pull,
      headRefName: expectedBranch,
      state: 'MERGED',
      mergedAt: '2026-11-09T12:00:00Z',
    })
    f.inspectBranch(expectedBranch)
    const pending = await f.start({ expectedBranch })
    if (pending.state !== 'pending') throw new Error('Expected Continue.')
    await f.finish()
    expect((await f.result(pending.continueId)).state).toBe('continued')
    const job = await f.storage.get<ContinueJob>(
      continueJobKey(pending.continueId),
    )
    if (!job) throw new Error('Expected the saved Continue job.')
    return job
  }

  const first = await continueOnce('octocat/test', 2)
  const second = await stored()
  expect(second).toEqual({
    branch: expect.stringMatching(/^[a-z0-9-]+\/saved-carts-v2-[a-z0-9]{4}$/),
    task: 2,
  })
  // A repeated publish write matches the earlier branch no longer.
  await storeContinuedBranch(f.options, first)
  expect(await stored()).toEqual(second)

  await continueOnce(second?.branch ?? '', 3)
  expect(await stored()).toEqual({
    branch: expect.stringMatching(/^[a-z0-9-]+\/saved-carts-v3-[a-z0-9]{4}$/),
    task: 3,
  })
})
