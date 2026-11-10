import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  repositoryBranchesPath,
  type WorkspaceBranchesResponse,
} from '../../src/shared/workspace-branches'
import { createApp } from '../application'
import { imageAppKey } from '../lifecycle/backend-image-fetch.test-support'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'
import { repositoryPull } from './fake-pull'

let fixture: GitHubTestHarness
let seeded: Awaited<ReturnType<GitHubTestHarness['seed']>>
beforeAll(async () => {
  fixture = await createGitHubHarness()
})
beforeEach(async () => {
  await fixture.reset()
  seeded = await fixture.seed()
  fixture.env.GITHUB_APP_PRIVATE_KEY = imageAppKey()
  await fixture.env.DB.prepare('UPDATE repositories SET selected = 1').run()
})
afterAll(async () => fixture.base.dispose())

async function read(query = '', cursor?: string, orgId = seeded.orgId) {
  const app = createApp({
    now: () => TEST_TIME,
    fetch: (request) =>
      new URL(request.url).pathname.endsWith('/access_tokens')
        ? Promise.resolve(Response.json({ token: 'branch-read-token' }))
        : fixture.api.fetch(request),
  })
  const url = new URL(
    repositoryBranchesPath(orgId, `repo-${seeded.orgId}`),
    TEST_ORIGIN,
  )
  url.searchParams.set('query', query)
  if (cursor) url.searchParams.set('cursor', cursor)
  return app.fetch(
    new Request(url, {
      headers: { Cookie: seeded.session, Origin: TEST_ORIGIN },
    }),
    fixture.env,
  )
}

async function rows(query = '') {
  const result: WorkspaceBranchesResponse['rows'][number][] = []
  let cursor: string | undefined
  do {
    const response = await read(query, cursor)
    expect(response.status).toBe(200)
    const page: WorkspaceBranchesResponse = await response.json()
    result.push(...page.rows)
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  return result
}

it('pages branches and open pull requests without default or duplicate branch rows, retaining foreign and deleted forks', async () => {
  fixture.api.pageSize = 1
  fixture.api.branches.set('refs/heads/standalone', 'standalone-tip')
  fixture.api.pulls[7] = repositoryPull({
    number: 7,
    title: 'Foreign work',
    headRefName: 'main',
    headRepository: { databaseId: 99 },
  })
  fixture.api.pulls[8] = repositoryPull({
    number: 8,
    title: 'Deleted fork',
    headRefName: 'deleted',
    headRepository: null,
  })
  fixture.api.pulls[9] = repositoryPull({ number: 9, state: 'CLOSED' })
  const result = await rows()
  expect(result).toEqual([
    {
      type: 'pull-request',
      number: 2,
      title: 'Add search',
      url: 'https://github.com/Codertocat/Hello-World/pull/2',
      branch: 'changes',
      headRepositoryId: 186853002,
      availability: 'available',
    },
    {
      type: 'pull-request',
      number: 7,
      title: 'Foreign work',
      url: 'https://github.com/Codertocat/Hello-World/pull/2',
      branch: 'main',
      headRepositoryId: 99,
      availability: 'another-repository',
    },
    {
      type: 'pull-request',
      number: 8,
      title: 'Deleted fork',
      url: 'https://github.com/Codertocat/Hello-World/pull/2',
      branch: 'deleted',
      headRepositoryId: null,
      availability: 'another-repository',
    },
    { type: 'branch', name: 'standalone' },
  ])
})

it('searches every page by title, number, and local branch while excluding foreign branch names', async () => {
  fixture.api.pageSize = 1
  fixture.api.branches.set('refs/heads/z-local', 'local-tip')
  fixture.api.pulls[27] = repositoryPull({
    number: 27,
    title: 'Needle in later page',
    headRefName: 'z-local',
  })
  fixture.api.pulls[28] = repositoryPull({
    number: 28,
    title: 'Foreign title',
    headRefName: 'foreign-only',
    headRepository: { databaseId: 999 },
  })
  for (const query of ['NEEDLE', '#27', 'z-local']) {
    expect(
      (await rows(query)).map((row) =>
        row.type === 'pull-request' ? row.number : row.name,
      ),
    ).toEqual([27])
  }
  expect(
    (await rows('#28')).map((row) =>
      row.type === 'pull-request' ? row.number : row.name,
    ),
  ).toEqual([28])
  expect(await rows('foreign-only')).toEqual([])
  expect(await rows('absent')).toEqual([])
})

it('guards org and repository access and returns a safe GitHub failure', async () => {
  const foreign = await read('', undefined, 'another-org')
  expect(foreign.status).toBe(404)
  expect(fixture.api.requests).toHaveLength(0)
  await fixture.env.DB.prepare('UPDATE repositories SET selected = 0').run()
  expect((await read()).status).toBe(404)
  expect(fixture.api.requests).toHaveLength(0)
  await fixture.env.DB.prepare('UPDATE repositories SET selected = 1').run()
  fixture.api.failure = new Response('private upstream detail', { status: 503 })
  const failed = await read()
  expect(failed.status).toBe(502)
  expect(await failed.json()).toEqual({
    error: {
      code: 'github_unavailable',
      message: 'GitHub is not available. Try again.',
    },
  })
  fixture.api.failure = null
  fixture.api.onRequest = async () => {
    await fixture.env.DB.prepare('UPDATE repositories SET selected = 0').run()
  }
  expect((await read()).status).toBe(404)
})
