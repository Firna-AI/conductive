import { expect, it } from 'vitest'

import { requestMerge } from './merge-client'
import { createPullRequestStack } from './stack-client'
import {
  memberToken,
  repository,
  stackRepository,
} from './stack-client.test-support'

it('starts and polls a direct layer merge with its head and the supplied token', async () => {
  const api = stackRepository()
  api.pulls[3].isDraft = false
  const stack = await createPullRequestStack(
    api.fetch,
    memberToken,
    repository,
    [2, 3],
  )
  const layer = stack.layers[1]
  const reply = await requestMerge(
    api.fetch,
    memberToken,
    repository,
    layer.number,
    {
      headSha: layer.headSha,
      method: 'squash',
    },
  )
  const uuid = '00000000-0000-4000-8000-000000000001'
  expect(reply).toEqual({
    status: 202,
    result: {
      state: 'pending',
      uuid,
      method: 'squash',
      action: 'direct_merge',
      headSha: 'layer-two-head',
      bypass: false,
    },
  })
  const start = api.requests[1]
  expect(start.url).toBe(
    'https://api.github.com/repos/Codertocat/Hello-World/pulls/3/merge-async',
  )
  expect(start.method).toBe('PUT')
  expect(start.headers.get('Authorization')).toBe('Bearer queuer-token')
  expect(await start.json()).toEqual({
    sha: 'layer-two-head',
    merge_method: 'squash',
    merge_action: 'direct_merge',
    bypass_rules: false,
  })
  for (const job of api.merges.jobs.values()) job.state = 'merged'
  await expect(
    requestMerge(api.fetch, memberToken, repository, 3, uuid),
  ).resolves.toEqual({
    status: 200,
    result: { state: 'merged' },
  })
  const poll = api.requests[2]
  expect(poll.url).toBe(
    'https://api.github.com/repos/Codertocat/Hello-World/pulls/3/merge-async/00000000-0000-4000-8000-000000000001',
  )
  expect(poll.method).toBe('GET')
  expect(poll.headers.get('Authorization')).toBe('Bearer queuer-token')
})

it('rejects a layer merge for an old head', async () => {
  const api = stackRepository()
  const reply = await requestMerge(api.fetch, memberToken, repository, 3, {
    headSha: 'stale-head',
    method: 'squash',
  })
  expect(reply).toEqual({ status: 400, result: { state: 'failed' } })
  expect(api.merges.jobs.size).toBe(0)
})
