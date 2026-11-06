import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { recordedPullRequest, recordedReviewThread } from './recorded-webhooks'
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

it('stores and publishes fresh banner state when recorded review threads change', async () => {
  const { workspace } = await harness.seed()
  harness.api.pull.mergeStateStatus = 'BLOCKED'
  expect(
    (await harness.webhook('pull_request', recordedPullRequest, 'initial'))
      .status,
  ).toBe(204)

  const reads = harness.api.requests.length
  const foreign = {
    ...recordedReviewThread,
    pull_request: {
      ...recordedReviewThread.pull_request,
      head: { ref: 'changes', repo: { id: 999 } },
    },
  }
  expect(
    (
      await harness.webhook(
        'pull_request_review_thread',
        foreign,
        'foreign-thread',
      )
    ).status,
  ).toBe(204)
  expect(harness.api.requests).toHaveLength(reads)

  const memory = harness.memory(workspace.id)
  for (const sample of [
    { action: 'resolved', mergeState: 'CLEAN', banner: 'ready-to-merge' },
    { action: 'unresolved', mergeState: 'BLOCKED', banner: 'blocked' },
  ]) {
    harness.api.pull.mergeStateStatus = sample.mergeState
    expect(
      (
        await harness.webhook(
          'pull_request_review_thread',
          { ...recordedReviewThread, action: sample.action },
          sample.action,
        )
      ).status,
    ).toBe(204)
    expect(memory.values.get('github:state'), sample.action).toMatchObject({
      banner: { state: sample.banner },
    })
    expect(memory.published.at(-1)?.event, sample.action).toMatchObject({
      type: 'github.updated',
      banner: { state: sample.banner },
    })
  }
  expect(memory.events.map((envelope) => envelope.eventNumber)).toEqual([
    1, 2, 3,
  ])
  expect(memory.published).toEqual(memory.events)
})
