import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { GitHubRateLimited } from './rate-limit'
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

const seconds = Math.floor(TEST_TIME / 1000)
const limited = (reset: number) =>
  Response.json(
    {
      errors: [
        {
          type: 'RATE_LIMITED',
          message: 'API rate limit already exceeded for installation ID 1.',
        },
      ],
    },
    {
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(reset),
      },
    },
  )

it.each([
  {
    limit: 'a used-up hourly limit',
    response: () => limited(seconds + 1800),
    resetAt: (seconds + 1800) * 1000,
  },
  {
    limit: 'a reset time that our clock has passed',
    response: () => limited(seconds - 5),
    resetAt: TEST_TIME + 60_000,
  },
  {
    limit: 'a secondary limit',
    response: () =>
      Response.json(
        { message: 'You have exceeded a secondary rate limit.' },
        { status: 403, headers: { 'retry-after': '120' } },
      ),
    resetAt: TEST_TIME + 120_000,
  },
])(
  'sends no read of the installation to GitHub after $limit',
  async (sample) => {
    const first = await harness.seed('changes', 'workspace-1')
    const second = await harness.seed('release', 'workspace-2', first.orgId)
    harness.api.failure = sample.response()

    await expect(harness.refresh(first.workspace, {})).rejects.toStrictEqual(
      new GitHubRateLimited(sample.resetAt),
    )
    expect(harness.api.requests).toHaveLength(1)
    harness.api.failure = null
    await expect(harness.refresh(second.workspace, {})).rejects.toStrictEqual(
      new GitHubRateLimited(sample.resetAt),
    )
    expect(harness.api.requests).toHaveLength(1)
    expect(harness.tokens).toEqual([first.workspace])
  },
)
