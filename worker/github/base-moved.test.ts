import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { repositoryPull } from './fake-pull'
import { recordedPush } from './recorded-webhooks'
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

async function stacked() {
  const f = await h.seed('run/stacked')
  await h.env.DB.prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('feature/review', f.workspace.id)
    .run()
  h.api.branches.set('refs/heads/run/stacked', 'run-tip')
  h.api.branches.set('refs/heads/feature/review', 'source-tip')
  h.api.comparisons.set('refs/heads/feature/review', new Map([['run-tip', 1]]))
  h.api.comparisons.get('refs/heads/main')!.set('run-tip', 2)
  const path = githubPaths.banner(f.orgId, f.workspace.id)
  expect((await h.read(path, f.session)).status).toBe(200)
  return { ...f, path }
}

it('moves a deleted base to the default and keeps its name across reads until a pull request opens', async () => {
  const f = await stacked()
  h.api.branches.delete('refs/heads/feature/review')
  expect(
    (
      await h.webhook(
        'push',
        {
          ...recordedPush,
          ref: 'refs/heads/feature/review',
          deleted: true,
        },
        'base-deleted',
      )
    ).status,
  ).toBe(204)
  const response = await h.read(f.path, f.session)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    banner: {
      state: 'none',
      branch: 'run/stacked',
      baseBranch: 'main',
      baseMoved: 'feature/review',
      pullRequest: null,
    },
  })
  expect(
    await h.env.DB.prepare(
      'SELECT base_branch AS base FROM workspaces WHERE id = ?',
    )
      .bind(f.workspace.id)
      .first(),
  ).toEqual({ base: null })
  h.memory(f.workspace.id).restart()
  expect(await (await h.read(f.path, f.session)).json()).toMatchObject({
    banner: {
      baseBranch: 'main',
      baseMoved: 'feature/review',
    },
  })
  h.api.pulls[3] = repositoryPull({
    number: 3,
    headRefName: 'run/stacked',
    headRefOid: 'run-tip',
  })
  h.api.checks.set('run-tip', [])
  const opened = await h.read(f.path, f.session)
  expect(opened.status).toBe(200)
  expect(await opened.json()).toMatchObject({
    banner: { pullRequest: { number: 3 } },
  })
  expect(
    (await h.memory(f.workspace.id).state.stored())?.banner,
  ).not.toHaveProperty('baseMoved')
  h.api.pulls = {}
  expect((await h.read(f.path, f.session)).status).toBe(200)
  expect(
    (await h.memory(f.workspace.id).state.stored())?.banner,
  ).not.toHaveProperty('baseMoved')
})

it('keeps the stored base and last banner when GitHub cannot answer', async () => {
  const f = await stacked()
  h.api.onRequest = async (operation) => {
    if (operation === 'RepositoryBranch')
      throw new Error('GitHub did not answer.')
  }
  expect((await h.read(f.path, f.session)).status).toBe(502)
  expect(
    await h.env.DB.prepare(
      'SELECT base_branch AS base FROM workspaces WHERE id = ?',
    )
      .bind(f.workspace.id)
      .first(),
  ).toEqual({ base: 'feature/review' })
  expect((await h.memory(f.workspace.id).state.stored())?.banner).toMatchObject(
    { baseBranch: 'feature/review' },
  )
  expect(
    (await h.memory(f.workspace.id).state.stored())?.banner,
  ).not.toHaveProperty('baseMoved')
})

it('repairs a base publication that failed after its moved banner committed', async () => {
  const f = await stacked()
  h.api.branches.delete('refs/heads/feature/review')
  await h.env.DB.exec(
    "CREATE TRIGGER reject_base_move BEFORE UPDATE OF base_branch ON workspaces BEGIN SELECT RAISE(ABORT, 'held base publication'); END",
  )
  expect((await h.read(f.path, f.session)).status).toBe(500)
  expect((await h.memory(f.workspace.id).state.stored())?.banner).toMatchObject(
    { baseMoved: 'feature/review' },
  )
  await h.env.DB.exec('DROP TRIGGER reject_base_move')
  h.memory(f.workspace.id).restart()
  const repaired = await h.read(f.path, f.session)
  expect(repaired.status).toBe(200)
  expect(await repaired.json()).toMatchObject({
    banner: { baseBranch: 'main', baseMoved: 'feature/review' },
  })
  expect(
    await h.env.DB.prepare(
      'SELECT base_branch AS base FROM workspaces WHERE id = ?',
    )
      .bind(f.workspace.id)
      .first(),
  ).toEqual({ base: null })
})
