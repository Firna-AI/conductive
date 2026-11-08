import { afterEach, beforeAll, expect, it } from 'vitest'

import { readOrg } from '../../src/app/api/read-core'
import { nested, record } from '../../src/app/api/parse'
import { readRepositories } from '../../src/app/api/read-settings'
import { ACCOUNT_PATHS } from '../../src/shared/account'
import { API_PATHS, orgPath } from '../../src/shared/api'
import { orgSettingsPaths, repositoryPath } from '../../src/shared/org-settings'
import { sectionsPath } from '../../src/shared/sections'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import {
  CATALOG_REPOSITORY,
  shellGitHubCatalog,
} from './feature-shell.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('loads real user and app repository access, creates an org with initials, and guards repository selection', async () => {
  fixture = await createOuterRuntime(bundle)
  const github = await shellGitHubCatalog(fixture)
  const installations = await fixture.request(ACCOUNT_PATHS.githubInstallations)
  expect(installations.status).toBe(200)
  expect(await installations.json()).toEqual({
    installations: [
      {
        id: 91,
        account: 'owner',
        repositoryCount: 2,
        settingsUrl: 'https://github.com/settings/installations/91',
      },
    ],
    installUrl: 'https://github.com/apps/conductive/installations/new',
  })
  const available = await fixture.request(ACCOUNT_PATHS.githubRepositories)
  expect(available.status).toBe(200)
  expect(await available.json()).toEqual({
    repositories: [
      CATALOG_REPOSITORY,
      {
        githubId: 101,
        fullName: 'owner/repository',
        description: '',
        defaultBranch: 'main',
        installationId: 91,
      },
    ],
  })
  expect(
    github.requests.some(
      (request) => new URL(request.url).searchParams.get('page') === '2',
    ),
  ).toBe(true)
  expect(
    github.requests.map((request) => request.headers.get('Authorization')),
  ).toEqual(github.requests.map(() => 'Bearer shell-github-user-token'))
  const created = await fixture.request(API_PATHS.orgs, {
    method: 'POST',
    body: JSON.stringify({
      name: 'A new org',
      initials: 'AN',
      repositoryIds: [202],
    }),
  })
  expect(created.status).toBe(201)
  const org = nested(record(await created.json()), 'org', readOrg)
  expect(org).toMatchObject({
    name: 'A new org',
    initials: 'AN',
    role: 'admin',
  })
  expect(await (await fixture.request(orgPath(org.id))).json()).toEqual({ org })
  expect(await (await fixture.request(API_PATHS.orgs)).json()).toMatchObject({
    orgs: expect.arrayContaining([
      { id: org.id, name: 'A new org', initials: 'AN', role: 'admin' },
    ]),
  })
  const sections = await fixture.request(sectionsPath(org.id))
  expect(sections.status).toBe(200)
  expect(await sections.json()).toMatchObject({
    sections: [
      { name: 'General', isDefault: true, collapsed: false, position: 0 },
    ],
  })
  const newOrgRepositories = readRepositories(
    await (await fixture.request(orgSettingsPaths.repositories(org.id))).json(),
  )
  expect(
    newOrgRepositories.map(({ githubId, selected }) => ({
      githubId,
      selected,
    })),
  ).toEqual([
    { githubId: 202, selected: true },
    { githubId: 101, selected: false },
  ])
  const choices = readRepositories(
    await (
      await fixture.request(orgSettingsPaths.repositories(OUTER_ORG))
    ).json(),
  )
  const candidate = choices.find((repository) => repository.githubId === 202)
  if (!candidate) throw new Error('The repository candidate is missing.')
  expect(candidate.selected).toBe(false)
  const path = repositoryPath(OUTER_ORG, candidate.id)
  const selected = await fixture.request(path, { method: 'PUT', body: '{}' })
  expect(selected.status).toBe(200)
  expect(
    readRepositories(await selected.json()).find(
      ({ githubId }) => githubId === 202,
    )?.selected,
  ).toBe(true)
  const denied = await fixture.request(path, {
    method: 'DELETE',
    headers: { Cookie: fixture.cookies.memberCookie },
    body: '{}',
  })
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  const removed = await fixture.request(path, { method: 'DELETE', body: '{}' })
  expect(removed.status).toBe(200)
  expect(
    readRepositories(await removed.json()).find(
      ({ githubId }) => githubId === 202,
    )?.selected,
  ).toBe(false)
  expect(
    await fixture.env.DB.prepare(
      'SELECT revision FROM settings WHERE org_id = ?',
    )
      .bind(OUTER_ORG)
      .first('revision'),
  ).toBe(3)
  github.removeCandidate()
  const unavailable = await fixture.request(path, { method: 'PUT', body: '{}' })
  expect(unavailable.status).toBe(404)
  expect(await unavailable.json()).toMatchObject({
    error: { code: 'repository_not_found' },
  })
  const invalid = await fixture.request(API_PATHS.orgs, {
    method: 'POST',
    body: JSON.stringify({ name: 'Unreachable org', repositoryIds: [999] }),
  })
  expect(invalid.status).toBe(404)
  expect(await invalid.json()).toMatchObject({
    error: { code: 'repository_not_found' },
  })
  expect(
    await fixture.env.DB.prepare(
      'SELECT COUNT(*) AS total FROM orgs WHERE name = ?',
    )
      .bind('Unreachable org')
      .first('total'),
  ).toBe(0)
})

it('refuses a repository write when the admin loses their role during the GitHub read', async () => {
  fixture = await createOuterRuntime(bundle)
  await shellGitHubCatalog(fixture)
  const choices = readRepositories(
    await (
      await fixture.request(orgSettingsPaths.repositories(OUTER_ORG))
    ).json(),
  )
  const candidate = choices.find((repository) => repository.githubId === 202)
  if (!candidate) throw new Error('The repository candidate is missing.')
  const active = fixture
  const fetch = fixture.github.fetch
  let roleChanged = false
  fixture.github.fetch = async (request) => {
    if (
      !roleChanged &&
      new URL(request.url).pathname === '/user/installations/91/repositories'
    ) {
      roleChanged = true
      await active.env.DB.prepare(
        `UPDATE org_members SET role = 'member' WHERE org_id = ? AND user_id = 'owner'`,
      )
        .bind(OUTER_ORG)
        .run()
    }
    return fetch(request)
  }
  const denied = await fixture.request(
    repositoryPath(OUTER_ORG, candidate.id),
    {
      method: 'PUT',
      body: '{}',
    },
  )
  expect(roleChanged).toBe(true)
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  expect(
    await fixture.env.DB.prepare(
      'SELECT COUNT(*) AS total FROM repositories WHERE org_id = ? AND github_repository_id = 202',
    )
      .bind(OUTER_ORG)
      .first('total'),
  ).toBe(0)
  expect(
    await fixture.env.DB.prepare(
      'SELECT revision FROM settings WHERE org_id = ?',
    )
      .bind(OUTER_ORG)
      .first('revision'),
  ).toBe(1)
})
