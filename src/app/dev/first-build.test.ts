import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { API_PATHS } from '../../shared/api'
import { orgSettingsPaths, repositoryPath } from '../../shared/org-settings'
import { workspacesPath } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { nested, record } from '../api/parse'
import { readOrg } from '../api/read-core'
import { readBuilds } from '../api/read-settings'
import { createBackend, guardScope } from './backend'
import { buildRoutes } from './build-routes'
import { createRoutes } from './create-routes'
import { readDevOptions } from './options'
import { orgRoutes } from './org-routes'
import { routeFetch } from './router'
import { seedState } from './seed'
import { settingsRoutes } from './settings-routes'
import { freshOrg } from './state'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FAKE_TIME)
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

function setup() {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions('?firstRun=org')),
    server.events,
    Date.now,
    () => 'unused',
  )
  const fetch = routeFetch(
    [
      ...orgRoutes(backend),
      ...settingsRoutes(backend),
      ...buildRoutes(backend),
      ...createRoutes(backend),
    ],
    (path, method) => guardScope(backend.state, path, method),
    server.fetch,
  )
  const request = (path: string, method = 'GET', body?: unknown) =>
    fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const create = async () => {
    const response = await request(API_PATHS.orgs, 'POST', {
      name: 'New org',
      repositoryIds: [5, 6],
    })
    expect(response.status).toBe(201)
    return nested(record(await response.json()), 'org', readOrg)
  }
  const builds = async (orgId: string) =>
    readBuilds(await (await request(orgSettingsPaths.builds(orgId))).json())
  return { backend, request, create, builds }
}

it('requires repositories and starts the first simulated build with the complete choice', async () => {
  const { backend, request, create, builds } = setup()
  const empty = await request(API_PATHS.orgs, 'POST', {
    name: 'Empty',
    repositoryIds: [],
  })
  expect(empty.status).toBe(400)
  expect(await empty.json()).toEqual({
    error: {
      code: 'repository_required',
      message: 'Choose at least one repository.',
    },
  })
  expect(backend.state.orgs).toEqual([])
  const org = await create()
  const state = backend.state.orgs[0]
  expect(
    state.repositories
      .filter((repository) => repository.selected)
      .map((repository) => repository.githubId),
  ).toEqual([5, 6])
  expect(
    await (await request(orgSettingsPaths.builds(org.id))).json(),
  ).toMatchObject({
    builds: [{ kind: 'build', state: 'running' }],
    currentImageBuildId: null,
  })
  expect((await builds(org.id)).changes.installScript).toBe(false)
  const refused = await request(workspacesPath(org.id), 'POST', {
    repositoryId: state.repositories[0].id,
    firstMessage: {
      id: 'message',
      text: 'Do the task',
      attachmentIds: [],
      choice: backend.state.account.defaultChoice,
    },
  })
  expect(refused.status).toBe(409)
  expect(await refused.json()).toEqual({
    error: {
      code: 'image_required',
      message: 'The cloud computer is still being prepared.',
    },
  })
})

it('builds changes made during the first good build once and keeps later changes pending', async () => {
  const { backend, request, create, builds } = setup()
  const org = await create()
  const state = backend.state.orgs[0]
  expect((await builds(org.id)).changes.installScript).toBe(false)
  await request(orgSettingsPaths.settings(org.id), 'PATCH', {
    installScript: 'echo first',
  })
  const repository = state.repositories.find((item) => !item.selected)
  if (!repository) throw new Error('Missing repository')
  await request(repositoryPath(org.id, repository.id), 'PUT', {})
  expect((await builds(org.id)).changes.installScript).toBe(true)
  await vi.advanceTimersByTimeAsync(6_000)
  expect(state.builds.map((item) => item.build.state)).toEqual([
    'running',
    'succeeded',
  ])
  expect(state.currentImageBuildId).toBe(state.builds[1].build.id)
  expect((await builds(org.id)).changes).toEqual({
    installScript: true,
    addedRepositories: [{ id: repository.id, fullName: repository.fullName }],
    removedRepositories: [],
  })
  await request(orgSettingsPaths.settings(org.id), 'PATCH', {
    installScript: 'echo later',
  })
  await vi.advanceTimersByTimeAsync(6_000)
  expect(state.builds.map((item) => item.build.state)).toEqual([
    'succeeded',
    'succeeded',
  ])
  expect((await builds(org.id)).changes).toEqual({
    installScript: true,
    addedRepositories: [],
    removedRepositories: [],
  })
  await request(orgSettingsPaths.builds(org.id), 'POST', {})
  await vi.advanceTimersByTimeAsync(6_000)
  expect((await builds(org.id)).changes.installScript).toBe(false)
})

it('uses the newest failed build before the first image and starts no added build after a failure', async () => {
  const { backend, request, builds } = setup()
  const state = freshOrg(
    { id: 'existing', name: 'Existing org', role: 'admin' },
    backend.state.account.user,
    FAKE_TIME,
    [5],
  )
  backend.state.orgs = [state]
  const path = orgSettingsPaths.settings(state.org.id)
  await request(path, 'PATCH', { installScript: 'exit 1' })
  expect((await builds(state.org.id)).changes.installScript).toBe(false)
  await request(orgSettingsPaths.builds(state.org.id), 'POST', {})
  expect((await builds(state.org.id)).changes.installScript).toBe(false)
  await request(path, 'PATCH', { installScript: 'echo fixed' })
  expect((await builds(state.org.id)).changes.installScript).toBe(true)
  await vi.advanceTimersByTimeAsync(6_000)
  expect(state.builds.map((item) => item.build.state)).toEqual(['failed'])
  expect(state.currentImageBuildId).toBe(null)
  expect((await builds(state.org.id)).changes.installScript).toBe(true)
  const refused = await request(workspacesPath(state.org.id), 'POST', {
    repositoryId: state.repositories[0].id,
    firstMessage: {
      id: 'message',
      text: 'Do the task',
      attachmentIds: [],
      choice: backend.state.account.defaultChoice,
    },
  })
  expect(refused.status).toBe(409)
  expect(await refused.json()).toMatchObject({
    error: {
      code: 'image_required',
      message:
        'The cloud computer needs a build. Ask an org admin to build it.',
    },
  })
  await request(orgSettingsPaths.builds(state.org.id), 'POST', {})
  expect((await builds(state.org.id)).changes.installScript).toBe(false)
  await vi.advanceTimersByTimeAsync(6_000)
  expect((await builds(state.org.id)).changes.installScript).toBe(false)
})
