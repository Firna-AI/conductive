import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { record, string } from '../chat/inputs'
import { TEST_TIME } from '../test-support/harness'
import { HEAD_SHA } from './fake-pull'
import { addMergeMember, createMergeHarness } from './merge.test-support'

let fixture: Awaited<ReturnType<typeof createMergeHarness>>
beforeAll(async () => {
  fixture = await createMergeHarness()
})
beforeEach(async () => {
  await fixture.harness.reset()
  fixture.jobs.clear()
})
afterAll(async () => {
  await fixture.base.dispose()
})
const input = { headSha: HEAD_SHA, method: 'squash' } as const

it('checks sign-in, membership, suspension, archival, and tokens before GitHub writes', async () => {
  const { orgId, session, userId } = await fixture.seed()
  expect((await fixture.start(orgId, '', input)).status).toBe(401)
  const db = fixture.env.DB
  for (const [sql, restore, status] of [
    [
      'UPDATE orgs SET suspended_at = 1',
      'UPDATE orgs SET suspended_at = NULL',
      403,
    ],
    [
      'UPDATE workspaces SET archived_at = 1',
      'UPDATE workspaces SET archived_at = NULL',
      409,
    ],
  ] as const) {
    await db.prepare(sql).run()
    expect((await fixture.start(orgId, session, input)).status).toBe(status)
    await db.prepare(restore).run()
  }
  await db
    .prepare('DELETE FROM github_connections WHERE user_id = ?')
    .bind(userId)
    .run()
  expect(
    await (await fixture.start(orgId, session, input)).json(),
  ).toMatchObject({ error: { code: 'github_reconnect_required' } })
  fixture.base.github.profile = { id: 8, login: 'outsider' }
  const outsider = await fixture.base.login()
  expect((await fixture.start(orgId, outsider, input)).status).toBe(404)
  expect(fixture.harness.api.requests).toEqual([])
})

it('uses another member own token and isolates poll jobs by member and workspace', async () => {
  const { orgId, session } = await fixture.seed()
  const { session: reviewer } = await addMergeMember(fixture.harness, orgId)
  fixture.harness.api.merges.memberPermissions.set('reviewer-token', 'MAINTAIN')
  const response = await fixture.start(orgId, reviewer, input)
  expect(response.status).toBe(202)
  const mergeId = string(record(await response.json()).mergeId)
  const before = fixture.harness.api.requests.length
  expect(
    (
      await fixture.request(
        githubPaths.mergeResult(orgId, 'workspace-1', mergeId),
        session,
      )
    ).status,
  ).toBe(404)
  await fixture.seed('changes', 'workspace-2', orgId)
  expect(
    (
      await fixture.request(
        githubPaths.mergeResult(orgId, 'workspace-2', mergeId),
        reviewer,
      )
    ).status,
  ).toBe(404)
  expect(fixture.harness.api.requests).toHaveLength(before)
  expect(
    fixture.harness.api.requests
      .find((request) => request.method === 'PUT')
      ?.headers.get('Authorization'),
  ).toBe('Bearer reviewer-token')
})

it('rechecks revoked access after capability reads and before post-merge publication', async () => {
  const { orgId, session, userId } = await fixture.seed()
  const other = await addMergeMember(fixture.harness, orgId, 'admin')
  await fixture.env.DB.prepare('UPDATE workspaces SET owner_user_id = ?')
    .bind(other.userId)
    .run()
  fixture.harness.api.onRequest = async (operation) => {
    if (operation === 'MergeCapabilities')
      await fixture.env.DB.prepare(
        'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(orgId, userId)
        .run()
  }
  expect((await fixture.start(orgId, session, input)).status).toBe(404)
  expect(
    fixture.harness.api.requests.some((request) => request.method === 'PUT'),
  ).toBe(false)
  await fixture.env.DB.prepare(
    "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
  )
    .bind(orgId, userId, TEST_TIME)
    .run()
  fixture.harness.api.onRequest = null
  const started = await fixture.start(orgId, session, input)
  expect(started.status).toBe(202)
  const mergeId = string(record(await started.json()).mergeId)
  const job = fixture.harness.api.merges.jobs.values().next().value
  if (!job) throw new Error('Missing fake job.')
  job.state = 'merged'
  fixture.harness.api.onRequest = async (operation) => {
    if (operation === 'BannerReviews')
      await fixture.env.DB.prepare(
        'UPDATE workspaces SET archived_at = 1',
      ).run()
  }
  expect(
    (
      await fixture.request(
        githubPaths.mergeResult(orgId, 'workspace-1', mergeId),
        session,
      )
    ).status,
  ).toBe(409)
  expect(fixture.harness.memory('workspace-1').published).toEqual([])
})
