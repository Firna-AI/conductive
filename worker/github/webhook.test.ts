import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_ORIGIN } from '../test-support/harness'
import { HEAD_SHA } from './fake-pull'
import {
  recordedCheckRun,
  recordedCheckSuite,
  recordedPullRequest,
  recordedPush,
  recordedReview,
  recordedStatus,
} from './recorded-webhooks'
import {
  createGitHubHarness,
  MACHINE_ORIGIN,
  type GitHubTestHarness,
} from './test-harness'

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

it('authenticates the exact raw bytes before parsing or accessing storage', async () => {
  const { workspace } = await harness.seed()
  const malformed = await harness.webhook('push', '{', 'bad-json', {
    headers: { 'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64) },
  })
  expect(malformed.status).toBe(403)
  expect(await malformed.json()).toMatchObject({
    error: { code: 'github_signature_invalid' },
  })
  const changed = await harness.webhook('push', recordedPush, 'changed-bytes', {
    body: JSON.stringify(recordedPush) + '\n',
  })
  expect(changed.status).toBe(403)
  expect(
    (await harness.webhook('push', recordedPush, 'wrong-host', {}, TEST_ORIGIN))
      .status,
  ).toBe(404)
  for (const path of ['/api/github/webhooks', '/webhooks/github']) {
    expect(
      (
        await harness.webhook(
          'push',
          recordedPush,
          'old-path',
          {},
          MACHINE_ORIGIN,
          path,
        )
      ).status,
      path,
    ).toBe(404)
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT count(*) AS count FROM github_webhook_deliveries',
    ).first('count'),
  ).toBe(0)
  expect(harness.tokens).toEqual([])
  const unicode = { ...recordedPush, sender: { login: '☃é' } }
  expect((await harness.webhook('push', unicode)).status).toBe(204)
  expect(
    harness.memory(workspace.id).events.map((envelope) => envelope.event.type),
  ).toEqual(['github.updated'])
  expect(
    (await harness.webhook('push', '{', 'signed-invalid-json')).status,
  ).toBe(400)
})

it('routes recorded branch events while workspaces need input and excludes foreign repositories and installations', async () => {
  const { orgId, workspace } = await harness.seed()
  await harness.seed('other/changes', 'workspace-2', orgId)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'input' WHERE org_id = ?",
  )
    .bind(orgId)
    .run()
  for (const [index, payload] of [
    { ...recordedPush, repository: { id: 999 } },
    { ...recordedPush, installation: { id: 999 } },
    { ...recordedPush, ref: 'refs/tags/changes' },
  ].entries()) {
    expect(
      (await harness.webhook('push', payload, `ignored-${index}`)).status,
    ).toBe(204)
  }
  const foreign = {
    ...recordedPullRequest,
    pull_request: {
      ...recordedPullRequest.pull_request,
      head: { ...recordedPullRequest.pull_request.head, repo: { id: 999 } },
    },
  }
  expect(
    (await harness.webhook('pull_request', foreign, 'foreign-fork')).status,
  ).toBe(204)
  expect(harness.tokens).toEqual([])
  expect(
    (await harness.webhook('pull_request', recordedPullRequest, 'pull-opened'))
      .status,
  ).toBe(204)
  expect(harness.memory(workspace.id).events).toHaveLength(1)
  expect(harness.states.has('workspace-2')).toBe(false)
  expect(
    (
      await harness.webhook(
        'push',
        { ...recordedPush, ref: 'refs/heads/main' },
        'base-push',
      )
    ).status,
  ).toBe(204)
  expect(harness.memory(workspace.id).events).toHaveLength(1)
  expect(harness.memory('workspace-2').events).toHaveLength(1)
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = 1 WHERE id = ?')
    .bind(orgId)
    .run()
  const requests = harness.api.requests.length
  expect(
    (await harness.webhook('push', recordedPush, 'deleted-org')).status,
  ).toBe(204)
  expect(harness.api.requests).toHaveLength(requests)
  expect(harness.memory(workspace.id).events).toHaveLength(1)
})

it('ignores check and status events without reading GitHub or changing a workspace', async () => {
  await harness.seed()
  for (const [index, sample] of [
    { event: 'check_run', body: recordedCheckRun },
    { event: 'check_suite', body: recordedCheckSuite },
    { event: 'status', body: { ...recordedStatus, sha: HEAD_SHA } },
  ].entries()) {
    expect(
      (await harness.webhook(sample.event, sample.body, `check-${index}`))
        .status,
      sample.event,
    ).toBe(204)
  }
  expect(harness.tokens).toEqual([])
  expect(harness.api.requests).toEqual([])
  expect([...harness.states.keys()]).toEqual([])
})

it('refreshes current review decisions after submission and dismissal webhooks', async () => {
  const { workspace } = await harness.seed()
  harness.api.pulls[2].reviewDecision = 'CHANGES_REQUESTED'
  harness.api.pulls[2].reviews = [
    { state: 'CHANGES_REQUESTED', author: { login: 'reviewer' } },
  ]
  expect(
    (
      await harness.webhook(
        'pull_request_review',
        recordedReview,
        'review-submit',
      )
    ).status,
  ).toBe(204)
  harness.api.pulls[2].reviewDecision = 'APPROVED'
  harness.api.pulls[2].reviews = [
    { state: 'DISMISSED', author: { login: 'reviewer' } },
  ]
  expect(
    (
      await harness.webhook(
        'pull_request_review',
        { ...recordedReview, action: 'dismissed' },
        'review-dismiss',
      )
    ).status,
  ).toBe(204)
  expect(
    harness.memory(workspace.id).events.map((envelope) => envelope.event),
  ).toMatchObject([
    {
      type: 'github.updated',
      banner: { state: 'changes-requested', changesRequestedBy: ['reviewer'] },
    },
    {
      type: 'github.updated',
      banner: { state: 'ready-to-merge', changesRequestedBy: [] },
    },
  ])
})

it('retries failed deliveries and publishes one stored event for concurrent duplicates', async () => {
  const { workspace } = await harness.seed()
  harness.api.failure = Response.json(
    { secret: 'server-read-token' },
    { status: 500 },
  )
  expect((await harness.webhook('push', recordedPush)).status).toBe(502)
  const processed = () =>
    harness.env.DB.prepare(
      'SELECT processed_at FROM github_webhook_deliveries WHERE delivery_id = ?',
    )
      .bind('delivery-1')
      .first('processed_at')
  expect(await processed()).toBe(null)
  expect(harness.memory(workspace.id).events).toEqual([])
  harness.api.failure = null
  harness.memory(workspace.id).failPublish = true
  expect((await harness.webhook('push', recordedPush)).status).toBe(500)
  expect(await processed()).toBe(null)
  expect(harness.memory(workspace.id).events).toHaveLength(1)
  const reads = harness.api.requests.length
  harness.memory(workspace.id).restart()
  harness.memory(workspace.id).failPublish = false
  const retries = await Promise.all([
    harness.webhook('push', recordedPush),
    harness.webhook('push', recordedPush),
  ])
  expect(retries.map((response) => response.status)).toEqual([204, 204])
  expect(harness.memory(workspace.id).events).toHaveLength(1)
  expect(
    harness
      .memory(workspace.id)
      .published.map((envelope) => envelope.eventNumber),
  ).toEqual([1, 1])
  expect(harness.memory(workspace.id).published).toEqual([
    harness.memory(workspace.id).values.get('workspace:event:1'),
    harness.memory(workspace.id).values.get('workspace:event:1'),
  ])
  expect(harness.api.requests).toHaveLength(reads)
  expect(await processed()).toBe(1800000000000)
  expect((await harness.webhook('push', recordedPush)).status).toBe(204)
  expect(harness.memory(workspace.id).published).toHaveLength(2)
})
