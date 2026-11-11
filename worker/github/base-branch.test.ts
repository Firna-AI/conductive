import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let h: GitHubTestHarness
beforeAll(async () => {
  h = await createGitHubHarness()
})
beforeEach(async () => {
  await h.reset()
})
afterAll(async () => {
  await h.base.dispose()
})

it('compares the run branch with its workspace base and opens its own pull request into that base', async () => {
  const { orgId, session, workspace } = await h.seed('run/fixes')
  await h.env.DB.prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('feature/review', workspace.id)
    .run()
  h.api.branches.set('refs/heads/run/fixes', 'run-tip')
  h.api.branches.set('refs/heads/feature/review', 'source-tip')
  h.api.comparisons.set('refs/heads/feature/review', new Map([['run-tip', 0]]))
  let response = await h.read(githubPaths.banner(orgId, workspace.id), session)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    banner: {
      state: 'no-commits',
      branch: 'run/fixes',
      baseBranch: 'feature/review',
      pullRequest: null,
    },
  })
  h.api.defaultBranch = 'release'
  h.api.branches.set('refs/heads/release', 'release-tip')
  h.api.comparisons.get('refs/heads/feature/review')!.set('run-tip', 1)
  response = await h.read(githubPaths.banner(orgId, workspace.id), session)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    banner: {
      state: 'none',
      branch: 'run/fixes',
      baseBranch: 'feature/review',
      pullRequest: null,
    },
  })
  h.api.pulls[3] = {
    ...h.api.pulls[2],
    number: 3,
    headRefName: 'run/fixes',
    headRefOid: 'run-tip',
    baseRefName: 'main',
    url: 'https://github.com/Codertocat/Hello-World/pull/3',
    potentialMergeCommit: null,
  }
  h.api.checks.set('run-tip', [])
  response = await h.read(githubPaths.banner(orgId, workspace.id), session)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    banner: {
      branch: 'run/fixes',
      baseBranch: 'feature/review',
      pullRequest: { number: 3 },
    },
  })
})
