import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  orgSettingsPaths,
  repositoryPath,
  repositoryPositionPath,
  type Repository,
} from '../../shared/org-settings'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import {
  readBuilds,
  readRepositories,
  readRepositoryOrder,
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
  const { api, org, waiting, removed, builds, save } = setup()
  const added = await save(waiting.id, true)
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
  const built = await save(waiting.id, true)
  const dropped = await save(removed.id, false)
  expect(org.builds.map((build) => build.build.state)).toEqual([
    'succeeded',
    'succeeded',
  ])
  expect((await builds()).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [{ id: removed.id, fullName: removed.fullName }],
  })
  // Each repositories reply says whether the current image holds each
  // repository, as the Worker does. The org has an image all the time.
  const readiness = (list: readonly Repository[]) => ({
    waiting: list.find((item) => item.id === waiting.id)?.ready,
    removed: list.find((item) => item.id === removed.id)?.ready,
    image: list.every((item) => item.imageReady === true),
  })
  const read = await api.get(
    orgSettingsPaths.repositories(org.org.id),
    readRepositories,
  )
  expect({
    added: readiness(added),
    built: readiness(built),
    dropped: readiness(dropped),
    read: readiness(read),
  }).toEqual({
    // The build of the add runs, so the image lacks the added repository.
    added: { waiting: false, removed: true, image: true },
    built: { waiting: true, removed: true, image: true },
    // The image holds the removed repository until the next build.
    dropped: { waiting: true, removed: true, image: true },
    read: { waiting: true, removed: true, image: true },
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

it('adds a repository again at the end of the order and moves a chosen one without a build', async () => {
  const { api, org, removed, save } = setup()
  const chosen = (repositories: readonly Repository[]) =>
    repositories
      .filter((repository) => repository.selected)
      .map((repository) => repository.id)
  const before = chosen(org.repositories)
  expect(before[0]).toBe(removed.id)
  expect(before.length).toBeGreaterThan(1)
  await save(removed.id, false)
  expect(chosen(await save(removed.id, true))).toEqual([
    ...before.slice(1),
    removed.id,
  ])
  await vi.advanceTimersByTimeAsync(6_000)
  const builds = org.builds.length
  const moved = await api.send(
    'PUT',
    repositoryPositionPath(org.org.id, removed.id),
    { index: 0 },
    readRepositoryOrder,
  )
  expect(moved.order).toEqual(before)
  expect(chosen(org.repositories)).toEqual(before)
  expect(org.builds).toHaveLength(builds)
})
