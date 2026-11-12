import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import {
  recordedPullRequest,
  recordedPush,
  recordedReview,
} from './recorded-webhooks'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let harness: GitHubTestHarness
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.base.dispose()
})

it('re-reads a non-default pull request base after its unchanged delivery commits', async () => {
  const { workspace } = await harness.seed()
  harness.api.branches.set('refs/heads/release', 'release-commit')
  harness.api.pulls[2].baseRefName = 'release'
  expect(
    (await harness.webhook('pull_request', recordedPullRequest, 'initial'))
      .status,
  ).toBe(204)
  const memory = harness.memory(workspace.id)
  const reads = harness.api.requests.length
  expect(
    (
      await harness.webhook(
        'push',
        { ...recordedPush, ref: 'refs/heads/release' },
        'release-push',
      )
    ).status,
  ).toBe(204)
  expect(harness.api.requests.length).toBeGreaterThan(reads)
  expect(memory.events).toHaveLength(1)
  expect(memory.published).toHaveLength(1)
  expect(memory.scheduled).toEqual([
    {
      request: { workspace, signal: { retryAttempt: 1 } },
      delayMs: 1000,
    },
  ])
  expect(
    await harness.env.DB.prepare(
      'SELECT processed_at FROM github_webhook_deliveries WHERE delivery_id = ?',
    )
      .bind('release-push')
      .first('processed_at'),
  ).toBe(TEST_TIME)
  harness.api.pulls[2].mergeStateStatus = 'BEHIND'
  await expect(harness.runScheduled(workspace.id)).resolves.toMatchObject({
    banner: { state: 'blocked', baseBranch: 'release' },
  })
  expect(memory.values.get('github:state')).toMatchObject({
    banner: { state: 'blocked', baseBranch: 'release' },
  })
  expect(memory.events.map((envelope) => envelope.eventNumber)).toEqual([1, 2])
  expect(memory.published).toEqual(memory.events)
  expect(memory.scheduled).toEqual([])
})

it('schedules fresh reads while merge state is pending and stores the later known state', async () => {
  const { workspace } = await harness.seed()
  expect(
    (await harness.webhook('pull_request', recordedPullRequest, 'initial'))
      .status,
  ).toBe(204)
  const memory = harness.memory(workspace.id)
  harness.api.pulls[2].mergeStateStatus = 'UNKNOWN'
  expect(
    (await harness.webhook('pull_request_review', recordedReview, 'pending'))
      .status,
  ).toBe(503)
  expect(memory.scheduled).toHaveLength(1)
  await expect(harness.runScheduled(workspace.id)).rejects.toMatchObject({
    code: 'github_pending',
  })
  expect(memory.events).toHaveLength(1)
  expect(memory.scheduled).toEqual([
    {
      request: { workspace, signal: { retryAttempt: 2 } },
      delayMs: 1000,
    },
  ])
  harness.api.pulls[2].mergeStateStatus = 'BLOCKED'
  await expect(harness.runScheduled(workspace.id)).resolves.toMatchObject({
    banner: { state: 'blocked' },
  })
  expect(memory.values.get('github:state')).toMatchObject({
    banner: { state: 'blocked' },
  })
  expect(memory.events.map((envelope) => envelope.eventNumber)).toEqual([1, 2])
  expect(memory.published).toEqual(memory.events)
  expect(memory.scheduled).toEqual([])
})

it('stops scheduling after three deferred reads when merge state stays unknown', async () => {
  const { workspace } = await harness.seed()
  harness.api.pulls[2].mergeable = 'UNKNOWN'
  expect(
    (await harness.webhook('pull_request_review', recordedReview, 'pending'))
      .status,
  ).toBe(503)
  const memory = harness.memory(workspace.id)
  for (const retryAttempt of [1, 2, 3]) {
    expect(memory.scheduled).toEqual([
      {
        request: { workspace, signal: { retryAttempt } },
        delayMs: 1000,
      },
    ])
    await expect(harness.runScheduled(workspace.id)).rejects.toMatchObject({
      status: 503,
      code: 'github_pending',
    })
  }
  expect(memory.scheduled).toEqual([])
  expect(memory.values.get('github:state')).toBeUndefined()
  expect(memory.events).toEqual([])
  expect(memory.published).toEqual([])
  expect(harness.tokens).toHaveLength(4)
})
