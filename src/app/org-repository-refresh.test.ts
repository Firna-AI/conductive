import { describe, expect, test } from 'vitest'

import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
  type Repository,
} from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  ManualFocus,
  requestLines,
  testServices,
} from './test-kit'

const orgId = FAKE_IDS.org
const repositoriesPath = orgSettingsPaths.repositories(orgId)
const buildsPath = orgSettingsPaths.builds(orgId)
const published = coreFixtures().build.build
const running: ImageBuild = {
  ...published,
  id: 'build-next',
  state: 'running',
  startedAt: FAKE_TIME,
  completedAt: null,
  durationMs: null,
}
const succeeded: ImageBuild = {
  ...running,
  state: 'succeeded',
  completedAt: FAKE_TIME + 1_000,
  durationMs: 1_000,
}
const failed: ImageBuild = {
  ...succeeded,
  state: 'failed',
  error: 'The install script failed.',
}
const repository: Repository = {
  id: 'waiting',
  orgId,
  githubId: 100,
  fullName: 'acme/waiting',
  description: '',
  defaultBranch: 'main',
  installationId: 1,
  selected: true,
  ready: false,
}

function history(
  latest: ImageBuild = running,
  currentImageBuildId: string | null = published.id,
): BuildsResponse {
  return {
    builds: latest.id === published.id ? [published] : [latest, published],
    currentImageBuildId,
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
    },
  }
}

function repositories(server: FakeApiServer, ready: boolean): void {
  server.json('GET', repositoriesPath, {
    repositories: [{ ...repository, ready }],
  })
}

async function setup(builds = history(), preloadBuilds = true) {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const delay = new ManualDelay()
  const focus = new ManualFocus()
  repositories(server, false)
  server.json('GET', buildsPath, builds)
  const model = new OrgModel(
    testServices(server, {
      fetch: held.fetch,
      delay: delay.delay,
      onFocus: focus.onFocus,
    }),
    orgId,
  )
  if (preloadBuilds) await model.reload('builds')
  return {
    server,
    held,
    delay,
    focus,
    model,
    reads: () =>
      requestLines(server).filter((line) => line === `GET ${repositoriesPath}`)
        .length,
    ready: () => valueOf(model.repositories.get())?.[0]?.ready,
  }
}

describe('repository reads after builds', () => {
  test('a completed build reloads shown repositories and keeps waiting until the reply confirms readiness', async () => {
    const { server, held, delay, focus, model, reads, ready } = await setup()
    const page = model.watch('repositories', 'builds')
    const picker = model.watch('repositories')
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 1,
      ready: false,
    })

    repositories(server, true)
    held.holdAnswer('GET', repositoriesPath)
    server.json('GET', buildsPath, history(succeeded, succeeded.id))
    await delay.runAll()
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 2,
      ready: false,
    })

    held.release('GET', repositoriesPath)
    await flushMicrotasks()
    expect(ready()).toBe(true)
    page()
    expect(focus.listening).toBe(1)
    picker()
    expect({ timers: delay.pending, focus: focus.listening }).toEqual({
      timers: 0,
      focus: 0,
    })
  })

  test('a build that starts and ends between polls reloads repositories without a changed image', async () => {
    const { server, delay, model, reads, ready } = await setup(
      history(published),
    )
    const release = model.watch('repositories', 'builds')
    await flushMicrotasks()

    server.json('GET', buildsPath, history(failed))
    await delay.runAll()
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 2,
      ready: false,
    })
    release()
  })

  test('a changed published image reloads repositories without a new completed build', async () => {
    const { server, delay, model, reads, ready } = await setup(
      history(published),
    )
    repositories(server, true)
    const release = model.watch('repositories', 'builds')
    await flushMicrotasks()
    expect(ready()).toBe(true)

    repositories(server, false)
    server.json('GET', buildsPath, history(published, null))
    await delay.runAll()
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 2,
      ready: false,
    })
    release()
  })

  test('a completion queues a fresh repositories read after an older answer and keeps waiting for its reply', async () => {
    const { server, held, delay, model, reads, ready } = await setup()
    const release = model.watch('repositories', 'builds')
    await flushMicrotasks()
    held.holdAnswer('GET', repositoriesPath)
    const olderRead = model.reload('repositories')
    await flushMicrotasks()

    repositories(server, true)
    held.holdAnswer('GET', repositoriesPath)
    server.json('GET', buildsPath, history(succeeded, succeeded.id))
    await delay.runAll()
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 2,
      ready: false,
    })

    held.release('GET', repositoriesPath)
    await olderRead
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 3,
      ready: false,
    })
    held.release('GET', repositoriesPath)
    await flushMicrotasks()
    expect(ready()).toBe(true)
    release()
  })

  test('unwatched repositories and unrelated build changes cause no repository read', async () => {
    const { server, delay, focus, model, reads } = await setup(
      history(published),
    )
    const sidebar = model.watch('builds')
    await flushMicrotasks()
    server.json('GET', buildsPath, history(failed))
    await delay.runAll()
    await flushMicrotasks()
    expect(reads()).toBe(0)

    const page = model.watch('repositories')
    await flushMicrotasks()
    const active = history({ ...running, id: 'build-later' })
    server.json('GET', buildsPath, {
      ...active,
      changes: { ...active.changes, installScript: true },
    })
    await delay.runAll()
    await flushMicrotasks()
    expect(reads()).toBe(1)

    page()
    model.putBuild(succeeded)
    await flushMicrotasks()
    expect(reads()).toBe(1)
    sidebar()
    expect({ timers: delay.pending, focus: focus.listening }).toEqual({
      timers: 0,
      focus: 0,
    })
  })

  test('the last repository watcher cancels a build refresh still queued behind an older read', async () => {
    const { server, held, delay, model, reads } = await setup()
    const sidebar = model.watch('builds')
    const page = model.watch('repositories')
    await flushMicrotasks()
    held.holdAnswer('GET', repositoriesPath)
    const olderRead = model.reload('repositories')
    await flushMicrotasks()

    server.json('GET', buildsPath, history(succeeded, succeeded.id))
    await delay.runAll()
    await flushMicrotasks()
    page()
    held.release('GET', repositoriesPath)
    await olderRead
    await flushMicrotasks()
    expect(reads()).toBe(2)
    sidebar()
    expect(delay.pending).toBe(0)
  })

  test('the first builds reply queues a fresh repositories read when no earlier builds value was known', async () => {
    const { server, held, model, reads, ready } = await setup(history(), false)
    held.holdAnswer('GET', repositoriesPath)
    const page = model.watch('repositories')
    await flushMicrotasks()
    repositories(server, true)
    server.json('GET', buildsPath, history(succeeded, succeeded.id))
    const sidebar = model.watch('builds')
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 1,
      ready: undefined,
    })

    held.release('GET', repositoriesPath)
    await flushMicrotasks()
    expect({ reads: reads(), ready: ready() }).toEqual({
      reads: 2,
      ready: true,
    })
    page()
    sidebar()
  })
})
