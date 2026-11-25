import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import {
  recordedPullRequest,
  recordedPush,
  recordedStatus,
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
  const inspect = () => harness.inspect(workspace.id)
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
  expect((await inspect()).events).toHaveLength(1)
  expect((await inspect()).published).toHaveLength(1)
  expect((await inspect()).scheduled).toEqual([
    {
      request: {
        workspace: { ...workspace, baseBranch: 'release' },
        signal: { retryAttempt: 1 },
      },
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
  expect((await inspect()).records.get('github:state')).toMatchObject({
    banner: { state: 'blocked', baseBranch: 'release' },
  })
  expect(
    (await inspect()).events.map((envelope) => envelope.eventNumber),
  ).toEqual([1, 2])
  expect((await inspect()).published).toEqual((await inspect()).events)
  expect((await inspect()).scheduled).toEqual([])
})

it('schedules fresh reads while merge state is pending and stores the later known state', async () => {
  const { workspace } = await harness.seed()
  expect(
    (await harness.webhook('pull_request', recordedPullRequest, 'initial'))
      .status,
  ).toBe(204)
  const inspect = () => harness.inspect(workspace.id)
  harness.api.pulls[2].mergeStateStatus = 'UNKNOWN'
  expect(
    (await harness.webhook('status', recordedStatus, 'pending')).status,
  ).toBe(503)
  expect((await inspect()).scheduled).toHaveLength(1)
  await expect(harness.runScheduled(workspace.id)).rejects.toMatchObject({
    code: 'github_pending',
  })
  expect((await inspect()).events).toHaveLength(1)
  expect((await inspect()).scheduled).toEqual([
    {
      request: { workspace, signal: { retryAttempt: 2 } },
      delayMs: 1000,
    },
  ])
  harness.api.pulls[2].mergeStateStatus = 'BLOCKED'
  await expect(harness.runScheduled(workspace.id)).resolves.toMatchObject({
    banner: { state: 'blocked' },
  })
  expect((await inspect()).records.get('github:state')).toMatchObject({
    banner: { state: 'blocked' },
  })
  expect(
    (await inspect()).events.map((envelope) => envelope.eventNumber),
  ).toEqual([1, 2])
  expect((await inspect()).published).toEqual((await inspect()).events)
  expect((await inspect()).scheduled).toEqual([])
})

it('stops scheduling after three deferred reads when merge state stays unknown', async () => {
  const { workspace } = await harness.seed()
  harness.api.pulls[2].mergeable = 'UNKNOWN'
  expect(
    (await harness.webhook('status', recordedStatus, 'pending')).status,
  ).toBe(503)
  const inspect = () => harness.inspect(workspace.id)
  for (const retryAttempt of [1, 2, 3]) {
    expect((await inspect()).scheduled).toEqual([
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
  expect((await inspect()).scheduled).toEqual([])
  expect((await inspect()).records.get('github:state')).toBeUndefined()
  expect((await inspect()).events).toEqual([])
  expect((await inspect()).published).toEqual([])
  expect(harness.tokens).toHaveLength(4)
})
