import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { orgSettingsPaths, repositoryPath } from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import {
  readBuilds,
  readRepositories,
  readSettings,
} from '../api/read-settings'
import { createBackend, guardScope } from './backend'
import { buildRoutes } from './build-routes'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'
import { settingsRoutes } from './settings-routes'

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
    seedState(readDevOptions('')),
    server.events,
    Date.now,
    () => 'unused',
  )
  const api = createApiClient(
    routeFetch(
      [...settingsRoutes(backend), ...buildRoutes(backend)],
      (path, method) => guardScope(backend.state, path, method),
      server.fetch,
    ),
  )
  const org = backend.state.orgs[0]
  const waiting = org.repositories.find((repository) => !repository.selected)
  const removed = org.repositories.find((repository) => repository.selected)
  if (!waiting || !removed) throw new Error('Missing repository choices')
  const builds = () => api.get(orgSettingsPaths.builds(org.org.id), readBuilds)
  const save = (id: string, selected: boolean) =>
    api.send(
      selected ? 'PUT' : 'DELETE',
      repositoryPath(org.org.id, id),
      {},
      readRepositories,
    )
  const script = (installScript: string) =>
    api.send(
      'PATCH',
      orgSettingsPaths.settings(org.org.id),
      { installScript },
      readSettings,
    )
  return { api, org, waiting, removed, builds, save, script }
}

it('builds an added repository once and keeps removals pending with separate change data', async () => {
  const { org, waiting, removed, builds, save } = setup()
  await save(waiting.id, true)
  const started = await builds()
  expect(started.builds.map((build) => build.state)).toEqual([
    'running',
    'succeeded',
  ])
  expect(started.changes).toEqual({
    installScript: false,
    addedRepositories: [{ id: waiting.id, fullName: waiting.fullName }],
    removedRepositories: [],
  })
  await save(waiting.id, true)
  await vi.advanceTimersByTimeAsync(6_000)
  expect((await builds()).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [],
  })
  await save(waiting.id, true)
  await save(removed.id, false)
  expect(org.builds.map((build) => build.build.state)).toEqual([
    'succeeded',
    'succeeded',
  ])
  expect((await builds()).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [{ id: removed.id, fullName: removed.fullName }],
  })
})

it('starts one added build for an add during a later build and leaves a later script change pending', async () => {
  const { api, org, waiting, builds, save, script } = setup()
  await api.send(
    'POST',
    orgSettingsPaths.builds(org.org.id),
    {},
    (value) => value,
  )
  await save(waiting.id, true)
  expect(org.builds).toHaveLength(2)
  await vi.advanceTimersByTimeAsync(6_000)
  expect(org.builds.map((build) => build.build.state)).toEqual([
    'running',
    'succeeded',
    'succeeded',
  ])
  await script('echo changed during the added build')
  await vi.advanceTimersByTimeAsync(6_000)
  expect(org.builds.map((build) => build.build.state)).toEqual([
    'succeeded',
    'succeeded',
    'succeeded',
  ])
  expect((await builds()).changes).toEqual({
    installScript: true,
    addedRepositories: [],
    removedRepositories: [],
  })
})

it('keeps waiting changes after a failed build and starts a new build when a repository is added again', async () => {
  const { org, waiting, builds, save, script } = setup()
  await script('exit 1')
  await save(waiting.id, true)
  await vi.advanceTimersByTimeAsync(6_000)
  expect(org.builds.map((build) => build.build.state)).toEqual([
    'failed',
    'succeeded',
  ])
  expect((await builds()).changes).toEqual({
    installScript: true,
    addedRepositories: [{ id: waiting.id, fullName: waiting.fullName }],
    removedRepositories: [],
  })
  await save(waiting.id, false)
  await script('echo fixed')
  await save(waiting.id, true)
  expect(org.builds.map((build) => build.build.state)).toEqual([
    'running',
    'failed',
    'succeeded',
  ])
  await vi.advanceTimersByTimeAsync(6_000)
  expect((await builds()).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [],
  })
})
