import { expect, it } from 'vitest'

import { HEAD_SHA } from './fake-pull'
import { changePullRequestBase } from './pull-client'
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
