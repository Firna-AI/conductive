import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { HEAD_SHA } from './fake-pull'
import {
  recordedCheckSuite,
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

async function seedTwo() {
  const { workspace, orgId } = await harness.seed()
  const second = await harness.seed('other', 'workspace-2', orgId)
  harness.api.branches.set('refs/heads/other', HEAD_SHA)
  expect(
    (await harness.webhook('pull_request', recordedPullRequest, 'opened'))
      .status,
  ).toBe(204)
  expect(
    (
      await harness.webhook(
        'push',
        { ...recordedPush, ref: 'refs/heads/other' },
        'other-push',
      )
    ).status,
  ).toBe(204)
  return { workspace, second: second.workspace }
}

async function readers(event: string, payload: unknown, deliveryId: string) {
  harness.tokens = []
  expect((await harness.webhook(event, payload, deliveryId)).status).toBe(204)
  return harness.tokens.map((target) => target.id)
}

it('reads only the workspaces that a push can change, from their stored state', async () => {
  const { workspace, second } = await seedTwo()
  expect(harness.memory(workspace.id).values.get('github:state')).toMatchObject(
    { banner: { baseBranch: 'main', pullRequest: { number: 2 } } },
  )
  expect(harness.memory(second.id).values.get('github:state')).toMatchObject({
    banner: { pullRequest: null },
  })
  const push = (ref: string) => ({ ...recordedPush, ref: `refs/heads/${ref}` })
  expect(await readers('push', push('unrelated'), 'unrelated')).toEqual([])
  expect(await readers('push', push('other'), 'other-again')).toEqual([
    second.id,
  ])
  expect(await readers('push', push('main'), 'main')).toEqual([workspace.id])
  expect(harness.memory(workspace.id).scheduled).toHaveLength(1)
  expect(harness.memory(second.id).scheduled).toEqual([])
})

it('skips a merged pull request when its base moves', async () => {
  const { workspace } = await seedTwo()
  harness.api.pulls[2].state = 'MERGED'
  harness.api.pulls[2].mergedAt = '2026-11-06T12:00:00Z'
  const merged = { ...recordedPullRequest, action: 'closed' }
  expect(await readers('pull_request', merged, 'merged')).toEqual([
    workspace.id,
  ])
  const main = { ...recordedPush, ref: 'refs/heads/main' }
  expect(await readers('push', main, 'main')).toEqual([])
})

it('ignores named and unnamed check events for stored workspaces', async () => {
  await seedTwo()
  expect(await readers('check_suite', recordedCheckSuite, 'suite')).toEqual([])
  const otherSuite = {
    ...recordedCheckSuite,
    check_suite: { ...recordedCheckSuite.check_suite, head_branch: 'main' },
  }
  expect(await readers('check_suite', otherSuite, 'main-suite')).toEqual([])
  expect(await readers('status', recordedStatus, 'unnamed')).toEqual([])
  const named = { ...recordedStatus, branches: [{ name: 'other' }] }
  expect(await readers('status', named, 'named')).toEqual([])
})
