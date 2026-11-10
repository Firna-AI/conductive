import { describe, expect, test } from 'vitest'
import { buildPath, orgSettingsPaths } from '../shared/org-settings'
import type { FetchLike } from './api/client'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
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
/** The builds while the saved install script differs from the image's. */
const scriptChanged = {
  ...fixture.builds,
  changes: { ...fixture.builds.changes, installScript: true },
}

/** Whether the builds of the org say that the install script changed. */
function scriptChange(model: OrgModel) {
  return valueOf(model.builds.get())?.changes.installScript
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

/**
 * The build ends with success, so the org image ran the saved install
 * script.
 */
function buildSucceeds(server: FakeApiServer): void {
  server.json('GET', buildPath(org, FAKE_IDS.build), fixture.build)
  server.json('GET', buildsPath, fixture.builds)
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

  test('a build that succeeds while the tab shows reads the builds again, so the change of the install script ends', async () => {
    const server = new FakeApiServer()
    server.json('GET', buildsPath, scriptChanged)
    // The timer of the log runs, and no timer of the builds runs.
    const { model, computer, delay } = await buildingTab(server)
    expect(scriptChange(model)).toBe(true)
    buildSucceeds(server)
    await delay.runAll()
    await flushMicrotasks()
    expect(scriptChange(model)).toBe(false)
    computer.stop()
  })

  test('a tab that opens after its build ended shows the end, and the changes of the server', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    server.json('GET', buildsPath, scriptChanged)
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
    const latest = builds && latestBuild(builds)?.state
    held.release('GET', buildsPath)
    await flushMicrotasks()
    expect({ latest, scriptChange: scriptChange(model) }).toEqual({
      latest: 'succeeded',
      scriptChange: false,
    })
    reopened.stop()
  })

  test('a settings read that fails keeps the shown settings', async () => {
    const server = new FakeApiServer()
    const computer = new ComputerModel(
      new OrgModel(testServices(server), org),
      new ManualDelay().delay,
    )
    computer.start()
    await flushMicrotasks()
    server.json(
      'GET',
      settingsPath,
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    // Try again of the settings reads them again.
    await computer.load()
    expect({
      reads: settingsReads(server),
      settings: computer.settings.get(),
    }).toEqual({
      reads: 2,
      settings: { state: 'ready', value: fixture.settings.settings },
    })
    computer.stop()
  })

  test('a save of the install script reads the builds again, so its change shows at once', async () => {
    const server = new FakeApiServer()
    const model = new OrgModel(testServices(server), org)
    const computer = new ComputerModel(model, new ManualDelay().delay)
    computer.start()
    await flushMicrotasks()
    const before = scriptChange(model)
    const installScript = 'apt-get install -y ripgrep\n'
    server.json('PATCH', settingsPath, {
      settings: { ...fixture.settings.settings, installScript },
    })
    server.json('GET', buildsPath, scriptChanged)
    await computer.saveScript('installScript', installScript)
    await flushMicrotasks()
    expect({ before, after: scriptChange(model) }).toEqual({
      before: false,
      after: true,
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
    const computer = new ComputerModel(
      new OrgModel(testServices(server, { fetch: held.fetch }), org),
      new ManualDelay().delay,
    )
    computer.start()
    await flushMicrotasks()
    held.hold('GET', settingsPath)
    // Try again of the settings reads them, and its answer is late.
    const reading = computer.load()
    const saved = {
      settings: {
        ...fixture.settings.settings,
        installScript: 'apt-get install -y ripgrep\n',
      },
    }
    server.json('PATCH', settingsPath, saved)
    await computer.saveScript('installScript', saved.settings.installScript)
    // The read answers with the settings from before the save.
    held.release('GET', settingsPath)
    await reading
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
