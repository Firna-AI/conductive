import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { BASE_CHANGE_JOB_KEY } from '../lifecycle/base-change-job'
import { TEST_TIME } from '../test-support/harness'
import { activeWorkspace } from './data'
import { repositoryPull } from './fake-pull'
import { recordedPullRequest, recordedPush } from './recorded-webhooks'
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

type SeededWorkspace = Awaited<ReturnType<GitHubTestHarness['seed']>>

const stackedBaseDeletion = {
  ...recordedPush,
  ref: 'refs/heads/feature/review',
  deleted: true,
}

function saved(f: SeededWorkspace) {
  return activeWorkspace(h.env.DB, f.workspace.id, f.orgId)
}

function savedMove(f: SeededWorkspace) {
  return h.actor(f.workspace.id).api.storage.get(BASE_CHANGE_JOB_KEY)
}

async function readBanner(f: SeededWorkspace) {
  const response = await h.read(
    githubPaths.banner(f.orgId, f.workspace.id),
    f.session,
  )
  expect(response.status).toBe(200)
  return response.json()
}

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
    (await h.webhook('push', stackedBaseDeletion, 'base-deleted')).status,
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
  expect(await saved(f)).toMatchObject({ baseBranch: null })
  await h.restart(f.workspace.id)
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
    (await h.actor(f.workspace.id).api.github.stored())?.banner,
  ).not.toHaveProperty('baseMoved')
  h.api.pulls = {}
  expect((await h.read(f.path, f.session)).status).toBe(200)
  expect(
    (await h.actor(f.workspace.id).api.github.stored())?.banner,
  ).not.toHaveProperty('baseMoved')
})

it('follows the live base of a draft on a pull request edited webhook', async () => {
  const f = await h.seed()
  h.api.pulls[2].isDraft = true
  expect(
    (await h.webhook('pull_request', recordedPullRequest, 'opened')).status,
  ).toBe(204)
  h.api.branches.set('refs/heads/release', 'release-tip')
  h.api.pulls[2].baseRefName = 'release'
  const edit = { ...recordedPullRequest, action: 'edited' }
  expect((await h.webhook('pull_request', edit, 'edited')).status).toBe(204)

  const state = await h.inspect(f.workspace.id)
  expect(state.events.at(-1)?.event).toMatchObject({
    type: 'github.updated',
    banner: { state: 'draft', baseBranch: 'release' },
  })
  expect(await saved(f)).toMatchObject({ baseBranch: 'release' })
  expect(state.records.get(BASE_CHANGE_JOB_KEY)).toMatchObject({
    change: { from: 'main', to: 'release' },
    target: 'release',
  })
  expect(state.records.get('alarm:baseChange')).toBe(TEST_TIME)
})

it('follows GitHub’s retarget of a stack without moving a deleted base to the default', async () => {
  const f = await stacked()
  h.api.pulls[3] = repositoryPull({
    number: 3,
    headRefName: 'run/stacked',
    headRefOid: 'run-tip',
    baseRefName: 'feature/review',
  })
  expect((await h.read(f.path, f.session)).status).toBe(200)
  h.api.branches.delete('refs/heads/feature/review')
  expect(
    (await h.webhook('push', stackedBaseDeletion, 'lower-branch-deleted'))
      .status,
  ).toBe(204)
  expect(await saved(f)).toMatchObject({ baseBranch: 'feature/review' })
  expect(await savedMove(f)).toBeUndefined()

  h.api.branches.set('refs/heads/release', 'release-tip')
  h.api.pulls[3].baseRefName = 'release'
  expect(
    (await h.webhook('push', stackedBaseDeletion, 'lower-branch-retargeted'))
      .status,
  ).toBe(204)
  expect(await saved(f)).toMatchObject({ baseBranch: 'release' })
  expect(await savedMove(f)).toMatchObject({
    change: { from: 'feature/review', to: 'release' },
    target: 'release',
  })
  const snapshot = await h.actor(f.workspace.id).api.github.stored()
  expect(snapshot?.banner).toMatchObject({ baseBranch: 'release' })
  expect(snapshot?.banner).not.toHaveProperty('baseMoved')
  expect(snapshot).not.toHaveProperty('baseChange')
})

it('stores the live default as null even before the repository row changes', async () => {
  const f = await stacked()
  h.api.defaultBranch = 'trunk'
  h.api.branches.set('refs/heads/trunk', 'trunk-tip')
  h.api.pulls[3] = repositoryPull({
    number: 3,
    headRefName: 'run/stacked',
    headRefOid: 'run-tip',
    baseRefName: 'trunk',
  })
  expect(await readBanner(f)).toMatchObject({ banner: { baseBranch: 'trunk' } })
  expect(await saved(f)).toMatchObject({
    baseBranch: null,
    defaultBranch: 'main',
  })
  expect(await savedMove(f)).toMatchObject({
    change: { from: 'feature/review', to: 'trunk' },
    target: null,
  })
})

it('keeps a null base at a default rename and leaves the cloud move to the repository webhook', async () => {
  const f = await h.seed()
  await h.env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'first-session', 'first-turn', 'claude', 'test-claude', 'high', 'first-message')`,
  )
    .bind(f.workspace.id, f.orgId, f.userId)
    .run()
  await readBanner(f)
  h.api.defaultBranch = 'trunk'
  h.api.branches.delete('refs/heads/main')
  h.api.branches.set('refs/heads/trunk', 'trunk-tip')
  h.api.pulls[2].baseRefName = 'trunk'
  expect(await readBanner(f)).toMatchObject({ banner: { baseBranch: 'trunk' } })
  expect(await saved(f)).toMatchObject({
    baseBranch: null,
    defaultBranch: 'main',
  })
  expect(await savedMove(f)).toBeUndefined()

  h.repositoryChange = {
    read: async () => ({
      fullName: h.api.fullName,
      defaultBranch: h.api.defaultBranch,
    }),
    prepareDefaultBranchChange: async (
      workspace,
      values,
      installationId,
      deliveryId,
    ) => {
      await h.refresh(workspace, {
        repositoryDefault: { ...values, installationId, deliveryId },
      })
    },
    changed: async () => {},
  }
  const rename = {
    action: 'edited',
    repository: recordedPullRequest.repository,
    installation: recordedPullRequest.installation,
    changes: { default_branch: { from: 'main' } },
  }
  expect(
    (await h.webhook('repository', rename, 'default-renamed')).status,
  ).toBe(204)
  expect(await saved(f)).toMatchObject({
    baseBranch: null,
    defaultBranch: 'trunk',
  })
  const move = await savedMove(f)
  expect(move).toMatchObject({ change: { from: 'main', to: 'trunk' } })
  expect(move).not.toHaveProperty('target')
  await readBanner(f)
  expect(await savedMove(f)).toEqual(move)
})

it.each([
  { state: 'MERGED', bannerState: 'merged' },
  { state: 'CLOSED', bannerState: 'closed' },
])(
  'keeps the stored default when the pull request is $bannerState',
  async ({ state, bannerState }) => {
    const f = await h.seed()
    h.api.pulls[2].state = state
    h.api.pulls[2].baseRefName = 'release'
    expect(await readBanner(f)).toMatchObject({
      banner: {
        state: bannerState,
        baseBranch: 'main',
        pullRequest: { number: 2 },
      },
    })
    expect(await saved(f)).toMatchObject({ baseBranch: null })
    expect(await savedMove(f)).toBeUndefined()
  },
)

it('follows an existing open pull request on its first read and saves one move', async () => {
  const f = await h.seed()
  h.api.branches.set('refs/heads/release', 'release-tip')
  h.api.pulls[2].baseRefName = 'release'
  expect(await readBanner(f)).toMatchObject({
    banner: { baseBranch: 'release' },
  })
  expect(await saved(f)).toMatchObject({ baseBranch: 'release' })
  const first = await h.inspect(f.workspace.id)
  const move = first.records.get(BASE_CHANGE_JOB_KEY)
  expect(move).toMatchObject({
    change: { from: 'main', to: 'release' },
    target: 'release',
  })
  await readBanner(f)
  const second = await h.inspect(f.workspace.id)
  expect(second.records.get(BASE_CHANGE_JOB_KEY)).toEqual(move)
  expect(second.events).toEqual(first.events)
})

it('keeps the stored base and last banner when GitHub cannot answer', async () => {
  const f = await stacked()
  h.api.onRequest = async (operation) => {
    if (operation === 'RepositoryBranch')
      throw new Error('GitHub did not answer.')
  }
  expect((await h.read(f.path, f.session)).status).toBe(502)
  expect(await saved(f)).toMatchObject({ baseBranch: 'feature/review' })
  expect(
    (await h.actor(f.workspace.id).api.github.stored())?.banner,
  ).toMatchObject({ baseBranch: 'feature/review' })
  expect(
    (await h.actor(f.workspace.id).api.github.stored())?.banner,
  ).not.toHaveProperty('baseMoved')
})
