import { expect, it } from 'vitest'

import { HEAD_SHA } from './fake-pull'
import {
  addPullRequestsToStack,
  createPullRequestStack,
  getPullRequestStack,
  listPullRequestStacks,
  unstackPullRequests,
} from './stack-client'
import {
  memberToken,
  repository,
  stackRepository,
} from './stack-client.test-support'

it('creates a stack and reads its ordered full and minimal layers', async () => {
  const api = stackRepository()
  const created = await createPullRequestStack(
    api.fetch,
    memberToken,
    repository,
    [2, 3],
  )
  expect(created).toEqual({
    id: 10001,
    number: 1,
    nodeId: 'STACK_1',
    baseBranch: 'main',
    open: true,
    layers: [
      {
        number: 2,
        nodeId: 'PR_2',
        baseBranch: 'main',
        baseSha: 'main-commit',
        baseRepositoryId: 186853002,
        headBranch: 'changes',
        headSha: HEAD_SHA,
        headRepositoryId: 186853002,
        draft: false,
        state: 'open',
        mergedAt: null,
      },
      {
        number: 3,
        nodeId: 'PR_3',
        baseBranch: 'changes',
        baseSha: HEAD_SHA,
        baseRepositoryId: 186853002,
        headBranch: 'layer-two',
        headSha: 'layer-two-head',
        headRepositoryId: 186853002,
        draft: true,
        state: 'open',
        mergedAt: null,
      },
    ],
  })
  await expect(
    getPullRequestStack(api.fetch, memberToken, repository, 1),
  ).resolves.toEqual(created)
  api.pulls[2].state = 'MERGED'
  api.pulls[2].mergedAt = '2026-11-23T12:00:00Z'
  await expect(
    listPullRequestStacks(api.fetch, memberToken, repository, 3),
  ).resolves.toEqual([
    {
      id: 10001,
      number: 1,
      nodeId: 'STACK_1',
      baseBranch: 'main',
      open: true,
      layers: [
        {
          number: 2,
          headBranch: 'changes',
          headSha: HEAD_SHA,
          draft: false,
          state: 'closed',
          mergedAt: 1795435200000,
        },
        {
          number: 3,
          headBranch: 'layer-two',
          headSha: 'layer-two-head',
          draft: true,
          state: 'open',
          mergedAt: null,
        },
      ],
    },
  ])
  await expect(
    listPullRequestStacks(api.fetch, memberToken, repository, 4),
  ).resolves.toEqual([])
  expect(
    api.requests.map(({ url, method }) => [
      method,
      new URL(url).pathname + new URL(url).search,
    ]),
  ).toEqual([
    ['POST', '/repos/Codertocat/Hello-World/stacks'],
    ['GET', '/repos/Codertocat/Hello-World/stacks/1'],
    ['GET', '/repos/Codertocat/Hello-World/stacks?pull_request=3'],
    ['GET', '/repos/Codertocat/Hello-World/stacks?pull_request=4'],
  ])
  expect(api.requests[0].headers.get('X-GitHub-Api-Version')).toBe('2026-03-10')
  expect(api.requests[0].headers.get('Authorization')).toBe(
    'Bearer queuer-token',
  )
  expect(await api.requests[0].json()).toEqual({ pull_requests: [2, 3] })
})

it('adds layers at the top and reads a remaining stack or a dissolved stack', async () => {
  const api = stackRepository()
  await createPullRequestStack(api.fetch, memberToken, repository, [2, 3])
  const added = await addPullRequestsToStack(
    api.fetch,
    memberToken,
    repository,
    1,
    [4],
  )
  expect(added.layers.map((layer) => layer.number)).toEqual([2, 3, 4])
  expect(await api.requests[1].json()).toEqual({ pull_requests: [4] })
  api.stacks.lockedPulls.add(2)
  const remaining = await unstackPullRequests(
    api.fetch,
    memberToken,
    repository,
    1,
  )
  expect(remaining?.layers.map((layer) => layer.number)).toEqual([2])
  api.stacks.lockedPulls.delete(2)
  await expect(
    unstackPullRequests(api.fetch, memberToken, repository, 1),
  ).resolves.toBeNull()
  expect(
    api.requests
      .slice(1)
      .map(({ url, method, body }) => [
        method,
        new URL(url).pathname,
        body === null,
      ]),
  ).toEqual([
    ['POST', '/repos/Codertocat/Hello-World/stacks/1/add', false],
    ['POST', '/repos/Codertocat/Hello-World/stacks/1/unstack', true],
    ['POST', '/repos/Codertocat/Hello-World/stacks/1/unstack', true],
  ])
  await expect(
    listPullRequestStacks(api.fetch, memberToken, repository, 2),
  ).resolves.toEqual([])
})
