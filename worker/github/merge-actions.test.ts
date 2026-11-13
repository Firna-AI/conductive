import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { record, string } from '../chat/inputs'
import { HEAD_SHA } from './fake-pull'
import { createMergeHarness } from './merge.test-support'

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

it('reads the clicking member capability without publishing it', async () => {
  const { orgId, session } = await fixture.seed()
  const response = await fixture.capability(orgId, session)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    canWrite: true,
    mergeMethod: 'squash',
  })
  expect(fixture.harness.states.size).toBe(0)
  expect(fixture.harness.api.requests[0].headers.get('Authorization')).toBe(
    'Bearer github-test-token',
  )
  for (const [permission, canWrite] of [
    ['READ', false],
    ['TRIAGE', false],
    ['MODERATE', false],
    ['TRIAGE_PLUS', false],
    ['WRITE', true],
    ['MAINTAIN', true],
    ['ADMIN', true],
  ] as const) {
    fixture.harness.api.merges.permission = permission
    const response = await fixture.capability(orgId, session)
    expect(response.status, permission).toBe(200)
    expect(await response.json(), permission).toEqual({
      canWrite,
      mergeMethod: canWrite ? 'squash' : null,
    })
  }
  fixture.harness.api.merges.allowedMethods = ['rebase']
  expect(await (await fixture.capability(orgId, session)).json()).toEqual({
    canWrite: true,
    mergeMethod: 'rebase',
  })
  fixture.harness.api.merges.allowedMethods = []
  expect(await (await fixture.capability(orgId, session)).json()).toEqual({
    canWrite: true,
    mergeMethod: null,
  })
  fixture.harness.api.merges.permission = null
  expect((await fixture.capability(orgId, session)).status).toBe(502)
})

it('starts and polls a direct member merge with the displayed head and publishes the completed state', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.branches.set('refs/heads/feature/review', 'review-base')
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET base_branch = ? WHERE id = ?',
  )
    .bind('feature/review', 'workspace-1')
    .run()
  const response = await fixture.start(orgId, session, {
    headSha: HEAD_SHA,
    method: 'squash',
  })
  expect(response.status).toBe(202)
  const body = record(await response.json())
  expect(body.state).toBe('pending')
  const mergeId = string(body.mergeId)
  const polled = await fixture.request(
    githubPaths.mergeResult(orgId, 'workspace-1', mergeId),
    session,
  )
  expect(polled.status).toBe(200)
  expect(await polled.json()).toEqual({ state: 'pending', mergeId })
  const write = fixture.harness.api.requests.find(
    (request) => request.method === 'PUT',
  )
  expect(write?.headers.get('Authorization')).toBe('Bearer github-test-token')
  expect(write?.headers.get('X-GitHub-Api-Version')).toBe('2026-03-10')
  expect(await write?.json()).toEqual({
    sha: HEAD_SHA,
    merge_method: 'squash',
    merge_action: 'direct_merge',
    bypass_rules: false,
  })
  const job = fixture.harness.api.merges.jobs.values().next().value
  if (!job) throw new Error('Missing fake merge job.')
  job.state = 'merged'
  const completed = await fixture.request(
    githubPaths.mergeResult(orgId, 'workspace-1', mergeId),
    session,
  )
  expect(await completed.json()).toEqual({ state: 'merged' })
  expect(
    fixture.harness.memory('workspace-1').published.at(-1)?.event,
  ).toMatchObject({
    type: 'github.updated',
    banner: {
      state: 'merged',
      baseBranch: 'feature/review',
      pullRequest: { headSha: HEAD_SHA },
    },
  })
  expect(
    JSON.stringify(fixture.harness.memory('workspace-1').published),
  ).not.toContain('canWrite')
  expect(JSON.stringify([...fixture.jobs.values()])).not.toContain(
    'github-test-token',
  )
})

it('refuses a moved displayed head before a GitHub merge write', async () => {
  const { orgId, session } = await fixture.seed()
  const response = await fixture.start(orgId, session, {
    headSha: 'old-head',
    method: 'squash',
  })
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'github_head_changed' },
  })
  expect(
    fixture.harness.api.requests.every(
      (request) => new URL(request.url).pathname === '/graphql',
    ),
  ).toBe(true)
})
