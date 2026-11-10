import { describe, expect, test } from 'vitest'
import { buildPath, orgSettingsPaths } from '../shared/org-settings'
import type { FetchLike } from './api/client'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import { ComputerModel } from './computer-model'
import { latestBuild, OrgModel } from './org-model'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  requestLines,
  testServices,
} from './test-kit'

const org = FAKE_IDS.org
const fixture = coreFixtures()
const running = {
  ...fixture.build,
  build: {
    ...fixture.build.build,
    state: 'running' as const,
    completedAt: null,
    durationMs: null,
  },
}
const settingsPath = orgSettingsPaths.settings(org)
const buildsPath = orgSettingsPaths.builds(org)
const changed = { settings: { ...fixture.settings.settings, needsBuild: true } }

function needsBuild(computer: ComputerModel) {
  const settings = computer.settings.get()
  return settings.state === 'ready' ? settings.value.needsBuild : settings.state
}

function settingsReads(server: FakeApiServer): number {
  return requestLines(server).filter((line) => line === `GET ${settingsPath}`)
    .length
}

/** An open Cloud computer tab whose build runs, with a manual log timer. */
async function buildingTab(server: FakeApiServer, fetch?: FetchLike) {
  server.json('POST', buildsPath, running, 202)
  server.json('GET', buildPath(org, FAKE_IDS.build), running)
  const delay = new ManualDelay()
  const model = new OrgModel(testServices(server, { fetch }), org)
  const computer = new ComputerModel(model, delay.delay)
  computer.start()
  await flushMicrotasks()
  await computer.startBuild()
  // The tab follows the new build: its log answers, and the timer waits.
  await flushMicrotasks()
  return { model, computer, delay }
}

/** The build ends with success, and the server clears `needsBuild`. */
function buildSucceeds(server: FakeApiServer): void {
  server.json('GET', buildPath(org, FAKE_IDS.build), fixture.build)
  server.json('GET', settingsPath, fixture.settings)
}

describe('ComputerModel', () => {
  test('a log refresh that answers after stop schedules no more requests', async () => {
    const server = new FakeApiServer()
    server.json('GET', buildsPath, {
      builds: [running.build],
      currentImageBuildId: null,
      changes: {
        installScript: false,
        addedRepositories: [],
        removedRepositories: [],
      },
    })
    server.json('GET', buildPath(org, FAKE_IDS.build), running)
    const held = new HeldRequests(server)
    const delay = new ManualDelay()
    const model = new OrgModel(testServices(server, { fetch: held.fetch }), org)
    const computer = new ComputerModel(model, delay.delay)
    computer.start()
    await flushMicrotasks()
    expect(delay.pending).toBe(1)
    held.hold('GET', buildPath(org, FAKE_IDS.build))
    const refreshing = delay.runAll()
    computer.stop()
    held.release('GET', buildPath(org, FAKE_IDS.build))
    await refreshing
    expect(delay.pending).toBe(0)
  })

  test('an env var value goes out with its mark, and the tab keeps only names and marks, with a missing mark as secret', async () => {
    const server = new FakeApiServer()
    const saved = fixture.settings.settings.envVars
    server.json('PATCH', orgSettingsPaths.settings(org), {
      settings: {
        ...fixture.settings.settings,
        envVars: [
          ...saved,
          { name: 'SENTRY_DSN', secret: false, value: 'stored-value' },
          { name: 'LEGACY_TOKEN' },
        ],
      },
    })
    const computer = new ComputerModel(
      new OrgModel(testServices(server), org),
      new ManualDelay().delay,
    )
    await computer.load()
    await computer.setEnvVar(
      'SENTRY_DSN',
      'https://key@sentry.example/1',
      false,
    )
    expect({
      write: await server.requests.at(-1)?.json(),
      shown: valueOf(computer.settings.get())?.envVars,
    }).toEqual({
      write: {
        envVars: [
          {
            operation: 'set',
            name: 'SENTRY_DSN',
            value: 'https://key@sentry.example/1',
            secret: false,
          },
        ],
      },
      shown: [
        ...saved,
        { name: 'SENTRY_DSN', secret: false },
        { name: 'LEGACY_TOKEN', secret: true },
      ],
    })
  })

  test('a build that succeeds while the tab shows reads the settings again, until the tab closes', async () => {
    const server = new FakeApiServer()
    server.json('GET', settingsPath, changed)
    const { model, computer, delay } = await buildingTab(server)
    expect(needsBuild(computer)).toBe(true)
    buildSucceeds(server)
    await delay.runAll()
    await flushMicrotasks()
    expect(needsBuild(computer)).toBe(false)
    computer.stop()
    // Another build ends after the tab closed, as the sidebar sees it.
    model.putBuild({
      ...fixture.build.build,
      id: 'build-2',
      startedAt: FAKE_TIME,
    })
    await flushMicrotasks()
    expect(settingsReads(server)).toBe(2)
  })

  test('a tab that opens after its build ended shows the end, and the settings of the server', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    server.json('GET', settingsPath, changed)
    const { model, computer } = await buildingTab(server, held.fetch)
    // The user leaves the tab while the build runs, and the build succeeds.
    computer.stop()
    buildSucceeds(server)
    held.hold('GET', buildsPath)
    const reopened = new ComputerModel(model, new ManualDelay().delay)
    // The tab follows the log of the build that it still shows as running.
    reopened.start()
    await flushMicrotasks()
    const builds = valueOf(model.builds.get())
    expect({
      latest: builds && latestBuild(builds)?.state,
      needsBuild: needsBuild(reopened),
    }).toEqual({ latest: 'succeeded', needsBuild: false })
    held.release('GET', buildsPath)
    reopened.stop()
  })

  test('a settings read that fails after a build keeps the shown settings', async () => {
    const server = new FakeApiServer()
    server.json('GET', settingsPath, changed)
    const { computer, delay } = await buildingTab(server)
    buildSucceeds(server)
    server.json(
      'GET',
      settingsPath,
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    await delay.runAll()
    await flushMicrotasks()
    expect({
      reads: settingsReads(server),
      settings: computer.settings.get(),
    }).toEqual({
      reads: 2,
      settings: { state: 'ready', value: changed.settings },
    })
    computer.stop()
  })

  test('a settings answer that comes after the tab closed changes nothing', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const computer = new ComputerModel(
      new OrgModel(testServices(server, { fetch: held.fetch }), org),
      new ManualDelay().delay,
    )
    held.hold('GET', settingsPath)
    computer.start()
    computer.stop()
    held.release('GET', settingsPath)
    await flushMicrotasks()
    expect({
      reads: settingsReads(server),
      settings: computer.settings.get(),
    }).toEqual({ reads: 1, settings: { state: 'loading' } })
  })

  test('a settings read that started before a save keeps the saved settings', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { computer, delay } = await buildingTab(server, held.fetch)
    server.json('GET', buildPath(org, FAKE_IDS.build), fixture.build)
    held.hold('GET', settingsPath)
    // The log timer sees the end of the build, so the settings read again.
    await delay.runAll()
    const saved = {
      settings: {
        ...fixture.settings.settings,
        installScript: 'apt-get install -y ripgrep\n',
        needsBuild: true,
      },
    }
    server.json('PATCH', settingsPath, saved)
    await computer.saveScript('installScript', saved.settings.installScript)
    // The read answers with the settings from before the save.
    held.release('GET', settingsPath)
    await flushMicrotasks()
    expect({
      reads: settingsReads(server),
      settings: computer.settings.get(),
    }).toEqual({
      reads: 2,
      settings: { state: 'ready', value: saved.settings },
    })
    computer.stop()
  })
})
