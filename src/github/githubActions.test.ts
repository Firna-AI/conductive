import { expect, it } from 'vitest'

import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { FAKE_GITHUB_HEAD_SHA } from '../test-support/fixtures/tools'
import { createGitHubActions, GitHubActionError } from './githubActions'
import { loadGitHubSnapshot } from './githubClient'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }

it('reads the head and member capability and sends the displayed head through merge and poll', async () => {
  const server = new FakeApiServer()
  const snapshot = await loadGitHubSnapshot(
    server.fetch,
    target,
    new AbortController().signal,
  )
  expect(snapshot.banner.pullRequest).toMatchObject({
    headSha: FAKE_GITHUB_HEAD_SHA,
  })
  const actions = createGitHubActions(server.fetch, target)
  expect(await actions.capabilities()).toEqual({
    canWrite: true,
    mergeMethod: 'squash',
  })
  const result = await actions.merge({
    headSha: FAKE_GITHUB_HEAD_SHA,
    method: 'squash',
  })
  expect(result).toEqual({
    state: 'pending',
    mergeId: `merge-${FAKE_IDS.workspace}`,
  })
  expect(await actions.mergeResult(`merge-${FAKE_IDS.workspace}`)).toEqual({
    state: 'merged',
  })
  const write = server.requests.find((request) => request.method === 'POST')
  expect(await write?.json()).toEqual({
    headSha: FAKE_GITHUB_HEAD_SHA,
    method: 'squash',
  })
  expect(new URL(write?.url ?? 'https://missing.test').pathname).toBe(
    githubPaths.merge(target.orgId, target.workspaceId),
  )
})

it('preserves app refusal codes and rejects incomplete action replies', async () => {
  const server = new FakeApiServer()
  const actions = createGitHubActions(server.fetch, target)
  server.json(
    'POST',
    githubPaths.merge(target.orgId, target.workspaceId),
    {
      error: {
        code: 'github_head_changed',
        message: 'Review the new commits.',
      },
    },
    409,
  )
  const refused = actions.merge({ headSha: 'seen-head', method: 'merge' })
  await expect(refused).rejects.toBeInstanceOf(GitHubActionError)
  await expect(refused).rejects.toMatchObject({
    code: 'github_head_changed',
    message: 'Review the new commits.',
  })
  server.json(
    'GET',
    githubPaths.capabilities(target.orgId, target.workspaceId),
    { canWrite: true },
  )
  await expect(actions.capabilities()).rejects.toMatchObject({
    code: null,
    message: 'The GitHub action did not finish. Try again.',
  })
})
