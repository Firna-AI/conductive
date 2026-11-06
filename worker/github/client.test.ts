import { beforeEach, expect, it } from 'vitest'

import { FakeGitHub } from '../test-support/fake-github'
import { TEST_TIME } from '../test-support/harness'
import { GitHubReader } from './client'
import type { GitHubWorkspace } from './contracts'
import { HEAD_SHA, page, passedRun, RepositoryGitHub } from './fake-repository'

const workspace: GitHubWorkspace = {
  id: 'workspace-1',
  orgId: 'org-1',
  branch: 'changes',
  repositoryId: 186853002,
  fullName: 'Codertocat/Hello-World',
  defaultBranch: 'main',
  installationId: 1,
}
let api: RepositoryGitHub
beforeEach(() => {
  api = new RepositoryGitHub(new FakeGitHub())
})
const read = () =>
  new GitHubReader(
    {
      fetch: (request) => api.fetch(request),
      now: () => TEST_TIME,
      token: async () => 'server-read-token',
    },
    workspace,
    'server-read-token',
  ).read()

it('maps pull request blockers and terminal states into the shared banner', async () => {
  const original = structuredClone(api.pull)
  const cases = [
    { patch: { isDraft: true }, checks: [passedRun], state: 'draft' },
    {
      patch: { mergeable: 'CONFLICTING' },
      checks: [passedRun],
      state: 'conflict',
    },
    {
      patch: { reviewDecision: 'CHANGES_REQUESTED' },
      checks: [passedRun],
      state: 'changes-requested',
    },
    {
      patch: {},
      checks: [{ ...passedRun, status: 'IN_PROGRESS', conclusion: null }],
      state: 'checks-running',
    },
    {
      patch: {},
      checks: [{ ...passedRun, conclusion: 'STARTUP_FAILURE' }],
      state: 'checks-failed',
    },
    {
      patch: { mergeStateStatus: 'CLEAN' },
      checks: [passedRun],
      state: 'ready-to-merge',
    },
    {
      patch: { state: 'MERGED', mergedAt: '2026-11-06T12:00:00Z' },
      checks: [],
      state: 'merged',
    },
    {
      patch: { state: 'CLOSED', closedAt: '2026-11-06T12:00:00Z' },
      checks: [],
      state: 'closed',
    },
  ]
  for (const sample of cases) {
    api.pull = { ...original, mergeStateStatus: 'BLOCKED', ...sample.patch }
    api.checkPages = { '': page(sample.checks) }
    const snapshot = await read()
    expect(snapshot.banner, sample.state).toMatchObject({
      branch: 'changes',
      baseBranch: 'main',
      state: sample.state,
      updatedAt: TEST_TIME,
    })
    expect(snapshot.checks.state).toBe('available')
    expect(snapshot.headSha).toBe(HEAD_SHA)
  }
})

it('offers the create link only for branch commits and waits for a pull request', async () => {
  api.lookupPages = { 'open:': page([]), 'closed:': page([]) }
  for (const sample of [
    { ahead: 0, state: 'no-commits', url: null },
    {
      ahead: 3,
      state: 'none',
      url: 'https://github.com/Codertocat/Hello-World/compare/main...changes?expand=1',
    },
  ]) {
    api.ahead = sample.ahead
    expect(await read()).toEqual({
      banner: {
        state: sample.state,
        branch: 'changes',
        baseBranch: 'main',
        updatedAt: TEST_TIME,
        pullRequest: null,
        createPullRequestUrl: sample.url,
      },
      checks: { state: 'waiting-for-pull-request', checks: [] },
      headSha: HEAD_SHA,
    })
    expect(api.requests.every((request) => request.method === 'POST')).toBe(
      true,
    )
  }
  api.headSha = null
  api.requests = []
  expect((await read()).banner).toMatchObject({
    state: 'no-commits',
    createPullRequestUrl: null,
  })
  expect(api.requests.every((request) => request.method === 'POST')).toBe(true)
})

it('paginates lookup, checks, and reviews while preserving GitHub order and durations', async () => {
  api.lookupPages = {
    'open:': page(
      [
        {
          number: 88,
          headRefName: 'changes',
          headRepository: { databaseId: 999 },
        },
      ],
      'pull-next',
    ),
    'open:pull-next': page([
      {
        number: 2,
        headRefName: 'changes',
        headRepository: { databaseId: 186853002 },
      },
    ]),
  }
  api.pull.reviewDecision = 'CHANGES_REQUESTED'
  api.checkPages = {
    '': page([passedRun], 'check-next'),
    'check-next': page([
      {
        __typename: 'StatusContext',
        id: 'status-a',
        context: 'A external CI',
        state: 'SUCCESS',
        createdAt: '2026-11-06T11:01:12Z',
      },
      {
        ...passedRun,
        id: 'run-b',
        name: 'B test',
        status: 'IN_PROGRESS',
        conclusion: null,
      },
    ]),
  }
  api.reviewPages = {
    '': page(
      [{ state: 'APPROVED', author: { login: 'alice' } }],
      'review-next',
    ),
    'review-next': page([
      { state: 'CHANGES_REQUESTED', author: { login: 'bob' } },
    ]),
  }
  const snapshot = await read()
  expect(snapshot.banner).toMatchObject({
    state: 'changes-requested',
    review: 'changes-requested',
    changesRequestedBy: ['bob'],
  })
  expect(snapshot.checks.checks).toEqual([
    {
      id: 'run-z',
      name: 'Z build',
      state: 'passed',
      url: 'https://github.com/Codertocat/Hello-World/runs/5',
      startedAt: 1793962800000,
      completedAt: 1793962872000,
      durationMs: 72000,
    },
    {
      id: 'status-a',
      name: 'A external CI',
      state: 'passed',
      url: 'https://github.com/Codertocat/Hello-World/pull/2/checks',
      startedAt: null,
      completedAt: 1793962872000,
      durationMs: null,
    },
    {
      id: 'run-b',
      name: 'B test',
      state: 'running',
      url: 'https://github.com/Codertocat/Hello-World/runs/5',
      startedAt: 1793962800000,
      completedAt: null,
      durationMs: null,
    },
  ])
})

it('shows known merge blockers and retries unresolved merge states', async () => {
  for (const state of ['BEHIND', 'BLOCKED']) {
    api.pull.mergeStateStatus = state
    await expect(read(), state).resolves.toMatchObject({
      banner: { state: 'blocked', review: 'approved' },
      checks: { state: 'available' },
      headSha: HEAD_SHA,
    })
  }
  for (const state of ['UNSTABLE', 'UNKNOWN']) {
    api.pull.mergeStateStatus = state
    await expect(read(), state).rejects.toMatchObject({
      status: 503,
      code: 'github_pending',
    })
  }
  api.pull.mergeStateStatus = 'CLEAN'
  api.pull.mergeable = 'UNKNOWN'
  await expect(read()).rejects.toMatchObject({
    status: 503,
    code: 'github_pending',
  })
})

it('refuses mismatched repositories, changed heads, and malformed upstream replies', async () => {
  api.repositoryId = 999
  await expect(read()).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  api.repositoryId = 186853002
  api.onRequest = async (operation) => {
    if (operation === 'BannerChecks') api.pull.headRefOid = 'new-head'
  }
  await expect(read()).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  api.lookupPages = { 'open:': page([]), 'closed:': page([]) }
  api.onRequest = async (operation) => {
    if (operation === 'BannerCompare') api.headSha = 'changed-comparison-head'
  }
  await expect(read()).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  api.onRequest = null
  api.failure = Response.json({
    data: { repository: { databaseId: 186853002, pullRequests: [] } },
  })
  await expect(read()).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
})
