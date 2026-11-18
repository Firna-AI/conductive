import { createHmac } from 'node:crypto'

import { afterAll, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { createApp } from '../application'
import { fakeCodexTasks } from '../codex-auth/tasks.test-support'
import { record } from '../chat/inputs'
import { seedPublishedImage } from '../lifecycle/published-image-test-support'
import {
  SOFTWARE_RELEASE,
  withSoftwareRelease,
} from '../lifecycle/software-release-test-support'
import { TEST_TIME } from '../test-support/harness'
import {
  createGitHubHarness,
  MACHINE_ORIGIN,
  WEBHOOK_SECRET,
  type GitHubTestHarness,
} from '../github/test-harness'

let harness: GitHubTestHarness
beforeAll(async () => {
  harness = await createGitHubHarness()
})
afterAll(async () => {
  await harness.base.dispose()
})

it('persists a pending push retry through eviction and publishes its alarm result before a browser read', async () => {
  const { workspace, orgId } = await harness.seed()
  const actor = harness.actor(workspace.id)
  await actor.ready
  await seedPublishedImage(harness.env.DB, {
    orgId,
    buildId: 'published-image',
    imageName: 'test-image',
    repositories: [
      {
        id: `repo-${orgId}`,
        orgId,
        fullName: workspace.fullName,
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE_RELEASE,
    now: TEST_TIME,
  })
  harness.api.pulls[2].mergeable = 'UNKNOWN'
  const app = createApp({
    now: () => TEST_TIME,
    fetch: withSoftwareRelease((request) =>
      new URL(request.url).hostname === 'boat.dev'
        ? harness.base.boat.fetch(request)
        : harness.api.fetch(request),
    ),
  })
  const body = JSON.stringify({
    repository: { id: 186853002 },
    installation: { id: 1 },
    ref: 'refs/heads/main',
  })
  const response = await app.fetch(
    new Request(`${MACHINE_ORIGIN}${MACHINE_PATHS.githubWebhook}`, {
      method: 'POST',
      body,
      headers: {
        'X-Hub-Signature-256': `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`,
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': 'pending-push',
      },
    }),
    {
      ...harness.env,
      GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
      WORKSPACES: harness.base.native.bindings.WORKSPACES,
    },
    fakeCodexTasks().execution,
  )
  expect(response.status).toBe(204)
  expect(
    await harness.env.DB.prepare(
      'SELECT processed_at FROM github_webhook_deliveries WHERE delivery_id = ?',
    )
      .bind('pending-push')
      .first('processed_at'),
  ).toBe(TEST_TIME)
  expect(
    await harness.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM image_builds WHERE org_id = ? AND kind = 'refresh'",
    )
      .bind(orgId)
      .first('count'),
  ).toBe(1)
  const waiting = await harness.inspect(workspace.id)
  expect(waiting.events).toEqual([])
  const retries = [...waiting.records].filter(([key]) =>
    key.startsWith('github-refresh:'),
  )
  expect(retries).toHaveLength(1)
  expect(record(retries[0]?.[1])).toEqual({
    at: TEST_TIME + 1000,
    request: { workspace, signal: { retryAttempt: 1 } },
  })
  expect(waiting.records.get('alarm:github')).toBe(TEST_TIME + 1000)
  expect(waiting.alarmAt).toBe(TEST_TIME + 1000)

  await harness.restart(workspace.id)
  const restored = await harness.inspect(workspace.id)
  expect(restored.instanceId).not.toBe(waiting.instanceId)
  expect(restored.records).toEqual(waiting.records)
  harness.api.pulls[2].mergeable = 'MERGEABLE'
  expect(
    await harness.base.native.advanceTo(TEST_TIME + 1000, [workspace.id]),
  ).toBe(1)
  const completed = await harness.inspect(workspace.id)
  expect(completed.records.get('github:state')).toMatchObject({
    banner: { state: 'ready-to-merge' },
  })
  expect(completed.events).toMatchObject([
    {
      eventNumber: 1,
      event: { type: 'github.updated', banner: { state: 'ready-to-merge' } },
    },
  ])
  expect(completed.events).toHaveLength(1)
  expect(completed.published).toEqual(completed.events)
  expect(completed.scheduled).toEqual([])
  expect(completed.records.has('alarm:github')).toBe(false)
})
