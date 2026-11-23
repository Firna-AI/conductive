import { expect, it } from 'vitest'

import { HEAD_SHA } from './fake-pull'
import { changePullRequestBase, rebasePullRequest } from './pull-client'
import {
  memberToken,
  repository,
  stackRepository,
} from './stack-client.test-support'

it('sets and confirms the base branch with a member token', async () => {
  const api = stackRepository()
  await expect(
    changePullRequestBase(api.fetch, memberToken, repository, 4, 'changes'),
  ).resolves.toEqual({ baseBranch: 'changes', baseSha: HEAD_SHA })
  expect(api.pulls[4].baseRefName).toBe('changes')
  const [request] = api.requests
  expect(request.method).toBe('PATCH')
  expect(request.url).toBe(
    'https://api.github.com/repos/Codertocat/Hello-World/pulls/4',
  )
  expect(request.headers.get('Authorization')).toBe('Bearer queuer-token')
  expect(await request.json()).toEqual({ base: 'changes' })
})

it('maps base change refusals and keeps the old base', async () => {
  const api = stackRepository()
  await expect(
    changePullRequestBase(
      api.fetch,
      memberToken,
      repository,
      4,
      'missing-branch',
    ),
  ).rejects.toMatchObject({
    status: 422,
    code: 'github_validation_failed',
    message: 'GitHub refused the request.',
  })
  await expect(
    changePullRequestBase(api.fetch, memberToken, repository, 10, 'changes'),
  ).rejects.toMatchObject({
    status: 404,
    code: 'github_not_found',
    message: 'GitHub could not find the requested resource.',
  })
  api.merges.memberPermissions.set(memberToken, 'READ')
  await expect(
    changePullRequestBase(api.fetch, memberToken, repository, 4, 'changes'),
  ).rejects.toMatchObject({
    status: 403,
    code: 'github_access_required',
    message: 'Your GitHub account cannot access this resource.',
  })
  expect(api.pulls[4].baseRefName).toBe('layer-two')
})

it('rejects a base change reply for a different base', async () => {
  const fetch = async () =>
    Response.json({ number: 4, base: { ref: 'main', sha: 'main-commit' } })
  await expect(
    changePullRequestBase(fetch, memberToken, repository, 4, 'changes'),
  ).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
})

it('asks GitHub to rebase the specified pull request at the expected head', async () => {
  const api = stackRepository()
  await expect(
    rebasePullRequest(api.fetch, memberToken, 'PR_3', 'layer-two-head'),
  ).resolves.toBeUndefined()
  const [request] = api.requests
  expect(request.method).toBe('POST')
  expect(request.url).toBe('https://api.github.com/graphql')
  expect(request.headers.get('Authorization')).toBe('Bearer queuer-token')
  expect(await request.json()).toEqual({
    query: expect.stringContaining('updatePullRequestBranch(input: $input)'),
    variables: {
      input: {
        pullRequestId: 'PR_3',
        expectedHeadOid: 'layer-two-head',
        updateMethod: 'REBASE',
      },
    },
  })
  expect(api.branches.get('refs/heads/layer-two')).toBe(
    'rebased-layer-two-head',
  )
  expect(api.pulls[3].headRefOid).toBe('rebased-layer-two-head')
  expect(api.pulls[3].baseRefName).toBe('changes')
})

it('maps rebase access and missing pull request errors from GraphQL', async () => {
  const api = stackRepository()
  await expect(
    rebasePullRequest(api.fetch, memberToken, 'PR_10', 'layer-two-head'),
  ).rejects.toMatchObject({
    status: 404,
    code: 'github_not_found',
    message: 'GitHub could not find the requested resource.',
  })
  api.merges.memberPermissions.set(memberToken, 'READ')
  await expect(
    rebasePullRequest(api.fetch, memberToken, 'PR_3', 'layer-two-head'),
  ).rejects.toMatchObject({
    status: 403,
    code: 'github_access_required',
    message: 'Your GitHub account cannot access this resource.',
  })
  expect(api.pulls[3].headRefOid).toBe('layer-two-head')
})

it('returns a fixed rebase refusal for a stale head or a conflict', async () => {
  const api = stackRepository()
  const refusal = {
    status: 409,
    code: 'github_rebase_refused',
    message: 'GitHub refused the rebase.',
  }
  await expect(
    rebasePullRequest(api.fetch, memberToken, 'PR_3', 'stale-head'),
  ).rejects.toMatchObject(refusal)
  api.pulls[3].mergeable = 'CONFLICTING'
  await expect(
    rebasePullRequest(api.fetch, memberToken, 'PR_3', 'layer-two-head'),
  ).rejects.toMatchObject(refusal)
  expect(api.branches.get('refs/heads/layer-two')).toBe('layer-two-head')
})

it('rejects a rebase reply for another pull request and a reply with partial data', async () => {
  const data = { updatePullRequestBranch: { pullRequest: { id: 'PR_3' } } }
  await expect(
    rebasePullRequest(
      async () => Response.json({ data }),
      memberToken,
      'PR_2',
      HEAD_SHA,
    ),
  ).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  const fetch = async () =>
    Response.json({ data, errors: [{ message: 'private GraphQL error' }] })
  await expect(
    rebasePullRequest(fetch, memberToken, 'PR_3', 'layer-two-head'),
  ).rejects.toMatchObject({
    status: 409,
    code: 'github_rebase_refused',
    message: 'GitHub refused the rebase.',
  })
})
