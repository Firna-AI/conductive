import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { HEAD_SHA } from './fake-pull'
import { recordedPush } from './recorded-webhooks'
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

const push = { ...recordedPush, ref: 'refs/heads/main' }

function processed() {
  return harness.env.DB.prepare(
    'SELECT processed_at FROM github_webhook_deliveries WHERE delivery_id = ?',
  )
    .bind('delivery-1')
    .first('processed_at')
}

async function seedWorkspaces() {
  const { workspace, orgId } = await harness.seed()
  const second = await harness.seed('other', 'workspace-2', orgId)
  harness.api.branches.set('refs/heads/other', HEAD_SHA)
  return { workspace, second: second.workspace }
}

it('completes a push after a pending workspace schedules its retry and later work runs', async () => {
  const { workspace, second } = await seedWorkspaces()
  harness.api.pulls[2].mergeStateStatus = 'UNKNOWN'
  const notifications: unknown[] = []
  harness.pushed = async (...input) => {
    notifications.push([input, harness.memory(second.id).events.length])
  }

  expect((await harness.webhook('push', push)).status).toBe(204)
  expect(harness.tokens.map((target) => target.id)).toEqual([
    workspace.id,
    second.id,
  ])
  expect(notifications).toEqual([[[186853002, 1, 'main'], 1]])
  expect(await processed()).toBe(TEST_TIME)
  expect(harness.memory(workspace.id).events).toEqual([])
  expect(harness.memory(workspace.id).scheduled).toEqual([
    { request: { workspace, signal: { retryAttempt: 1 } }, delayMs: 1000 },
  ])
  const reads = harness.api.requests.length
  expect((await harness.webhook('push', push)).status).toBe(204)
  expect(harness.api.requests).toHaveLength(reads)
  expect(notifications).toHaveLength(1)

  harness.api.pulls[2].mergeStateStatus = 'CLEAN'
  await expect(harness.runScheduled(workspace.id)).resolves.toMatchObject({
    banner: { state: 'ready-to-merge' },
  })
  expect(harness.memory(workspace.id).events).toHaveLength(1)
  expect(harness.memory(workspace.id).scheduled).toEqual([])
})

it('runs later push steps after a failed publication and replays receipts until image refresh succeeds', async () => {
  const { workspace, second } = await seedWorkspaces()
  const first = harness.memory(workspace.id)
  first.failPublish = true
  let notifications = 0
  let imageFailure = false
  harness.pushed = async () => {
    notifications++
    if (imageFailure) throw new Error('Image refresh failed')
  }

  const failed = await harness.webhook('push', push)
  expect(failed.status).toBe(500)
  expect(await failed.json()).toMatchObject({
    error: { code: 'internal_error' },
  })
  expect(harness.memory(second.id).events).toHaveLength(1)
  expect(harness.memory(second.id).published).toHaveLength(1)
  expect(notifications).toBe(1)
  expect(await processed()).toBeNull()

  const reads = harness.api.requests.length
  first.failPublish = false
  imageFailure = true
  expect((await harness.webhook('push', push)).status).toBe(500)
  expect(harness.api.requests).toHaveLength(reads)
  expect(await processed()).toBeNull()

  imageFailure = false
  expect((await harness.webhook('push', push)).status).toBe(204)
  expect(harness.api.requests).toHaveLength(reads)
  expect(notifications).toBe(3)
  expect(first.events).toHaveLength(1)
  expect(first.published.map((event) => event.eventNumber)).toEqual([1, 1])
  expect(harness.memory(second.id).events).toHaveLength(1)
  expect(await processed()).toBe(TEST_TIME)
})
