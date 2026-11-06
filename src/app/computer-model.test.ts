import { describe, expect, test } from 'vitest'
import {
  buildEventsPath,
  buildPath,
  orgSettingsPaths,
} from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { ComputerModel } from './computer-model'
import { OrgModel } from './org-model'
import { HeldRequests, ManualDelay, testServices } from './test-kit'

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

describe('ComputerModel', () => {
  test('a log refresh that answers after stop schedules no more requests', async () => {
    const server = new FakeApiServer()
    server.json('GET', buildPath(org, FAKE_IDS.build), running)
    const held = new HeldRequests(server)
    const delay = new ManualDelay()
    const model = new OrgModel(testServices(server, { fetch: held.fetch }), org)
    const computer = new ComputerModel(model, delay.delay)
    await computer.showLog(running.build)
    expect(delay.pending).toBe(1)
    held.hold('GET', buildEventsPath(org, FAKE_IDS.build))
    const refreshing = delay.runAll()
    computer.stop()
    held.release('GET', buildEventsPath(org, FAKE_IDS.build))
    await refreshing
    expect(delay.pending).toBe(0)
  })

  test('an env var value goes out in the write, and the tab keeps only names', async () => {
    const server = new FakeApiServer()
    const names = [...fixture.settings.settings.envVars, { name: 'SENTRY_DSN' }]
    server.json('PATCH', orgSettingsPaths.settings(org), {
      settings: { ...fixture.settings.settings, envVars: names },
    })
    const computer = new ComputerModel(
      new OrgModel(testServices(server), org),
      new ManualDelay().delay,
    )
    await computer.load()
    await computer.setEnvVar('SENTRY_DSN', 'https://key@sentry.example/1')
    expect(await server.requests.at(-1)?.json()).toEqual({
      envVars: [
        {
          operation: 'set',
          name: 'SENTRY_DSN',
          value: 'https://key@sentry.example/1',
        },
      ],
    })
    expect(computer.settings.get()).toMatchObject({
      state: 'ready',
      value: { envVars: names },
    })
  })
})
