import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { TEST_ORIGIN } from '../test-support/harness'
import { page, passedRun } from './fake-repository'
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

it('reads current banner and checks on tab open while the workspace needs input', async () => {
  const { orgId, session } = await harness.seed()
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'input' WHERE id = ?",
  )
    .bind('workspace-1')
    .run()
  harness.api.pull.mergeStateStatus = 'BLOCKED'
  harness.api.pull.reviewDecision = 'REVIEW_REQUIRED'
  const banner = await harness.read(
    githubPaths.banner(orgId, 'workspace-1'),
    session,
  )
  expect(banner.status).toBe(200)
  expect(banner.headers.get('Cache-Control')).toBe('no-store')
  expect(await banner.json()).toMatchObject({
    banner: { branch: 'changes', state: 'blocked', review: 'pending' },
  })
  harness.api.checkPages = {
    '': page([{ ...passedRun, status: 'IN_PROGRESS', conclusion: null }]),
  }
  const checksPath = githubPaths
    .checks(orgId, 'workspace-1')
    .replace('workspace-1', '%77orkspace-1')
  const checks = await harness.read(checksPath, session)
  expect(checks.status).toBe(200)
  expect(await checks.json()).toMatchObject({
    state: 'available',
    checks: [{ state: 'running', durationMs: null }],
  })
  const head = await harness.read(checksPath, session, { method: 'HEAD' })
  expect(head.status).toBe(200)
  expect(await head.text()).toBe('')
  expect(
    harness
      .memory('workspace-1')
      .events.map((envelope) => envelope.eventNumber),
  ).toEqual([1, 2, 3])
  expect(
    harness.api.requests.every(
      (request) =>
        request.headers.get('Authorization') === 'Bearer server-read-token',
    ),
  ).toBe(true)
})

it('excludes unsigned users, foreign orgs, deleted orgs, and suspended installations before reads', async () => {
  const { orgId, session } = await harness.seed()
  const path = githubPaths.banner(orgId, 'workspace-1')
  expect((await harness.read(path)).status).toBe(401)
  expect(
    (
      await harness.read(path, session, {
        headers: { Origin: 'https://untrusted.test' },
      })
    ).status,
  ).toBe(403)
  expect(
    (
      await harness.read(path, session, {
        headers: { Upgrade: 'websocket', Origin: TEST_ORIGIN },
      })
    ).status,
  ).toBe(404)
  const otherOrg = await harness.base.createOrg(session)
  expect(
    (
      await harness.read(
        githubPaths.banner(otherOrg.id, 'workspace-1'),
        session,
      )
    ).status,
  ).toBe(404)
  harness.base.github.profile = { id: 8, login: 'outsider' }
  const outsider = await harness.base.login()
  expect((await harness.read(path, outsider)).status).toBe(404)
  await harness.env.DB.prepare(
    'UPDATE github_installations SET suspended_at = 1',
  ).run()
  expect((await harness.read(path, session)).status).toBe(404)
  await harness.env.DB.prepare(
    'UPDATE github_installations SET suspended_at = NULL',
  ).run()
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = 1 WHERE id = ?')
    .bind(orgId)
    .run()
  expect((await harness.read(path, session)).status).toBe(404)
  expect(harness.tokens).toEqual([])
  expect(harness.api.requests).toEqual([])
  expect(harness.states.size).toBe(0)
})

it('keeps upstream secrets and access revoked during reads out of responses and publication', async () => {
  const { orgId, session } = await harness.seed()
  const path = githubPaths.banner(orgId, 'workspace-1')
  harness.api.failure = Response.json(
    { secret: 'server-read-token' },
    { status: 403 },
  )
  const failure = await harness.read(path, session)
  expect(failure.status).toBe(502)
  expect(await failure.json()).toEqual({
    error: {
      code: 'github_unavailable',
      message: 'GitHub is not available. Try again.',
    },
  })
  harness.api.failure = null
  const requestsBeforeRevocation = harness.api.requests.length
  harness.api.onRequest = async () => {
    await harness.env.DB.prepare('UPDATE orgs SET deleted_at = 1 WHERE id = ?')
      .bind(orgId)
      .run()
  }
  expect((await harness.read(path, session)).status).toBe(404)
  expect(harness.api.requests).toHaveLength(requestsBeforeRevocation + 1)
  expect(harness.memory('workspace-1').events).toEqual([])
  expect(harness.memory('workspace-1').published).toEqual([])
})
