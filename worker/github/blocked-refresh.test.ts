import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { recordedPullRequest, recordedPush } from './recorded-webhooks'
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

it.each([
  {
    blocker: 'missing approval',
    event: 'pull_request',
    payload: recordedPullRequest,
    mergeState: 'BLOCKED',
    reviewDecision: 'REVIEW_REQUIRED',
    review: 'pending',
  },
  {
    blocker: 'branch behind its base',
    event: 'push',
    payload: { ...recordedPush, ref: 'refs/heads/main' },
    mergeState: 'BEHIND',
    reviewDecision: 'APPROVED',
    review: 'approved',
  },
])(
  'publishes blocked for $blocker after a signed recorded webhook',
  async (sample) => {
    const { workspace } = await harness.seed()
    harness.api.pull.mergeStateStatus = sample.mergeState
    harness.api.pull.reviewDecision = sample.reviewDecision

    const response = await harness.webhook(
      sample.event,
      sample.payload,
      'merge-blocker',
    )
    expect(response.status).toBe(204)
    const memory = harness.memory(workspace.id)
    expect(memory.events).toMatchObject([
      {
        eventNumber: 1,
        event: {
          type: 'github.updated',
          banner: {
            state: 'blocked',
            branch: 'changes',
            baseBranch: 'main',
            updatedAt: TEST_TIME,
            pullRequest: {
              number: 2,
              title: 'Add search',
              url: 'https://github.com/Codertocat/Hello-World/pull/2',
            },
            review: sample.review,
            changesRequestedBy: [],
            mergedAt: null,
            closedAt: null,
          },
          checks: { state: 'available', checks: [{ state: 'passed' }] },
        },
      },
    ])
    expect(memory.published).toEqual(memory.events)
  },
)
