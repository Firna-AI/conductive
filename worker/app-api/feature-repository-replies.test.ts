import { afterEach, beforeAll, expect, it } from 'vitest'

import { readRepositories } from '../../src/app/api/read-settings'
import { repositoryPath } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
} from '../chat/integration/outer-seed.test-support'
import { shellRepositoryId } from './feature-repositories-data'
import {
  CATALOG_REPOSITORY,
  shellGitHubCatalog,
} from './feature-shell.test-support'
import { shellRepositories } from './shell-data'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

async function setup(repositoryId: string, selected: boolean) {
  const active = (fixture = await createOuterRuntime(bundle))
  await shellGitHubCatalog(active)
  const fetch = active.github.fetch
  let cataloguesBeforeSave = 0
  let callsAfterSave = 0
  active.github.fetch = async (request) => {
    const stored = await shellRepositories(active.env.DB, OUTER_ORG)
    if (stored.find(({ id }) => id === repositoryId)?.selected === selected) {
      callsAfterSave += 1
      return new Response('GitHub is down', { status: 502 })
    }
    const url = new URL(request.url)
    if (url.pathname === '/user/installations') cataloguesBeforeSave += 1
    if (url.pathname === '/user/installations/91/repositories') {
      const repositories = [
        {
          ...CATALOG_REPOSITORY,
          githubId: 101,
          fullName: 'owner/repository',
          description: '',
          defaultBranch: 'main',
        },
        CATALOG_REPOSITORY,
        {
          ...CATALOG_REPOSITORY,
          githubId: 303,
          fullName: 'owner/unused-repository',
        },
      ]
      return Response.json({
        total_count: 3,
        repositories: repositories.map((repository) => ({
          id: repository.githubId,
          full_name: repository.fullName,
          description: repository.description,
          default_branch: repository.defaultBranch,
        })),
      })
    }
    return fetch(request)
  }
  return {
    active,
    calls: () => ({ cataloguesBeforeSave, callsAfterSave }),
  }
}

it('answers an Add with its saved selection and catalogue when GitHub fails after the save', async () => {
  const candidateId = shellRepositoryId(OUTER_ORG, 202)
  const { active, calls } = await setup(candidateId, true)
  const response = await active.request(
    repositoryPath(OUTER_ORG, candidateId),
    { method: 'PUT', body: JSON.stringify({ build: false }) },
  )
  expect(
    (await shellRepositories(active.env.DB, OUTER_ORG)).map(
      ({ githubId, selected }) => ({ githubId, selected }),
    ),
  ).toEqual([
    { githubId: 101, selected: true },
    { githubId: 202, selected: true },
  ])
  expect(response.status).toBe(200)
  expect(
    readRepositories(await response.json()).map(
      ({ githubId, selected, ready, imageReady }) => ({
        githubId,
        selected,
        ready,
        imageReady,
      }),
    ),
  ).toEqual([
    { githubId: 101, selected: true, ready: true, imageReady: true },
    { githubId: 202, selected: true, ready: false, imageReady: true },
    { githubId: 303, selected: false, ready: false, imageReady: true },
  ])
  expect(calls()).toEqual({ cataloguesBeforeSave: 1, callsAfterSave: 0 })
})

it('answers a Remove with its saved selection and catalogue when GitHub fails after the save', async () => {
  const { active, calls } = await setup(OUTER_REPOSITORY, false)
  const response = await active.request(
    repositoryPath(OUTER_ORG, OUTER_REPOSITORY),
    { method: 'DELETE', body: '{}' },
  )
  expect(
    (await shellRepositories(active.env.DB, OUTER_ORG)).map(
      ({ githubId, selected }) => ({ githubId, selected }),
    ),
  ).toEqual([{ githubId: 101, selected: false }])
  expect(response.status).toBe(200)
  expect(
    readRepositories(await response.json()).map(
      ({ githubId, selected, ready, imageReady }) => ({
        githubId,
        selected,
        ready,
        imageReady,
      }),
    ),
  ).toEqual([
    { githubId: 202, selected: false, ready: false, imageReady: true },
    { githubId: 101, selected: false, ready: true, imageReady: true },
    { githubId: 303, selected: false, ready: false, imageReady: true },
  ])
  expect(calls()).toEqual({ cataloguesBeforeSave: 1, callsAfterSave: 0 })
})
