import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { repositoryBranchesPath } from '../../src/shared/branches'
import {
  createGitHubHarness,
  type GitHubTestHarness,
} from '../github/test-harness'
import type { HttpFetch } from '../env'
import { addMergeMember } from '../github/merge.test-support'

let fixture: GitHubTestHarness
let session: string
let orgId: string
let path: string
let signIn: HttpFetch
beforeAll(async () => {
  fixture = await createGitHubHarness()
  signIn = fixture.base.github.fetch
})
beforeEach(async () => {
  await fixture.reset()
  fixture.base.github.fetch = signIn
  const seeded = await fixture.seed()
  ;({ session, orgId } = seeded)
  path = repositoryBranchesPath(orgId, `repo-${orgId}`)
  fixture.base.github.fetch = (request) =>
    new URL(request.url).pathname === '/graphql'
      ? fixture.api.fetch(request)
      : signIn(request)
})
afterAll(async () => {
  await fixture.base.dispose()
})

it('lists the default first and all other branches by commit date, with live search across pages', async () => {
  fixture.api.pageSize = 1
  fixture.api.branches.set('refs/heads/feature/old', 'old')
  fixture.api.branches.set('refs/heads/feature/new', 'new')
  fixture.api.commitDates.set('old', '2026-11-02T00:00:00Z')
  fixture.api.commitDates.set('new', '2026-11-12T00:00:00Z')
  const response = await fixture.base.request(path, session)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    defaultBranch: 'main',
    branches: [
      { name: 'main', committedAt: Date.parse('2026-11-01T00:00:00Z') },
      { name: 'feature/new', committedAt: Date.parse('2026-11-12T00:00:00Z') },
      { name: 'feature/old', committedAt: Date.parse('2026-11-02T00:00:00Z') },
      { name: 'changes', committedAt: Date.parse('2026-11-01T00:00:00Z') },
    ],
  })
  expect(
    fixture.api.requests.map((request) => request.headers.get('Authorization')),
  ).toEqual(Array(4).fill('Bearer github-test-token'))
  fixture.api.branches.delete('refs/heads/feature/old')
  const searched = await fixture.base.request(
    `${path}?search=feature%2F`,
    session,
  )
  expect(await searched.json()).toEqual({
    defaultBranch: 'main',
    branches: [
      { name: 'feature/new', committedAt: Date.parse('2026-11-12T00:00:00Z') },
    ],
  })
  expect(
    await (await fixture.base.request(`${path}?search=absent`, session)).json(),
  ).toEqual({ defaultBranch: 'main', branches: [] })
})

it('lists only the known default for an empty repository', async () => {
  fixture.api.branches.clear()
  const response = await fixture.base.request(path, session)
  expect(await response.json()).toEqual({
    defaultBranch: 'main',
    branches: [{ name: 'main', committedAt: null }],
  })
})

it('keeps orgs and repositories isolated before it reads GitHub', async () => {
  const other = await fixture.base.createOrg(session, 'Other org')
  for (const target of [
    repositoryBranchesPath(other.id, `repo-${orgId}`),
    repositoryBranchesPath(orgId, 'absent'),
  ]) {
    const response = await fixture.base.request(target, session)
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'repository_not_found' },
    })
  }
  fixture.base.github.profile = { id: 8, login: 'outsider' }
  const outsider = await fixture.base.login()
  const response = await fixture.base.request(path, outsider)
  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({
    error: { code: 'org_not_found' },
  })
  expect(fixture.api.requests).toHaveLength(0)
})

it('reports unavailable GitHub without exposing its response', async () => {
  fixture.api.failure = Response.json(
    { secret: 'Private GitHub detail' },
    { status: 503 },
  )
  const response = await fixture.base.request(path, session)
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_unavailable',
      message: 'GitHub is not available. Try again.',
    },
  })
})

it('reports missing repository access instead of a missing branch', async () => {
  fixture.api.deniedTokens.add('github-test-token')
  const response = await fixture.base.request(path, session)
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'github_access_required' },
  })
})

it('refuses to return branches after membership is removed during the read', async () => {
  const member = await addMergeMember(fixture, orgId)
  fixture.api.onRequest = async () => {
    await fixture.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(orgId, member.userId)
      .run()
  }
  const response = await fixture.base.request(path, member.session)
  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({
    error: { code: 'org_not_found' },
  })
})
