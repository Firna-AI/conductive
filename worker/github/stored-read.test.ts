import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
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

it('returns the stored state of the branch without a GitHub read', async () => {
  const { orgId, session } = await harness.seed()
  const path = githubPaths.stored(orgId, 'workspace-1')
  const empty = await harness.read(path, session)
  expect(empty.status).toBe(200)
  expect(empty.headers.get('Cache-Control')).toBe('no-store')
  expect(await empty.json()).toEqual({ state: null })
  expect(harness.api.requests).toEqual([])
  expect(
    (await harness.read(githubPaths.banner(orgId, 'workspace-1'), session))
      .status,
  ).toBe(200)
  const reads = harness.api.requests.length
  const stored = await harness.read(path, session)
  expect(stored.status).toBe(200)
  const body: unknown = await stored.json()
  expect(body).toMatchObject({
    state: {
      banner: { branch: 'changes', state: 'ready-to-merge' },
      checks: { state: 'available', checks: [{ state: 'passed' }] },
    },
  })
  // The reply keeps to the contract: no head commit beside the two parts.
  expect(Object.keys((body as { state: object }).state).sort()).toEqual([
    'banner',
    'checks',
  ])
  expect(harness.api.requests).toHaveLength(reads)
})

it('returns no stored state of an earlier branch', async () => {
  const { orgId, session } = await harness.seed()
  await harness.read(githubPaths.banner(orgId, 'workspace-1'), session)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET branch = 'next' WHERE id = ?",
  )
    .bind('workspace-1')
    .run()
  const stored = await harness.read(
    githubPaths.stored(orgId, 'workspace-1'),
    session,
  )
  expect(stored.status).toBe(200)
  expect(await stored.json()).toEqual({ state: null })
})

it('excludes outsiders and suspended installations from the stored state', async () => {
  const { orgId, session } = await harness.seed()
  await harness.read(githubPaths.banner(orgId, 'workspace-1'), session)
  const path = githubPaths.stored(orgId, 'workspace-1')
  expect((await harness.read(path)).status).toBe(401)
  harness.base.github.profile = { id: 8, login: 'outsider' }
  const outsider = await harness.base.login()
  expect((await harness.read(path, outsider)).status).toBe(404)
  await harness.env.DB.prepare(
    'UPDATE github_installations SET suspended_at = 1',
  ).run()
  expect((await harness.read(path, session)).status).toBe(404)
})
