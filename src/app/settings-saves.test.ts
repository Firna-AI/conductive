import { describe, expect, test } from 'vitest'
import { orgSettingsPaths } from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { ApiError } from './api/client'
import { ComputerModel } from './computer-model'
import { OrgModel } from './org-model'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  testServices,
} from './test-kit'

const org = FAKE_IDS.org
const settingsPath = orgSettingsPaths.settings(org)
const saved = coreFixtures().settings.settings
/** The settings on the server after a save of the install script. */
const installed = {
  settings: {
    ...saved,
    installScript: `${saved.installScript}\nnpm install -g pnpm`,
  },
}
/** The settings on the server after that save and a save of the startup script. */
const both = {
  settings: { ...installed.settings, startupScript: 'npm run dev' },
}
const refused = {
  error: { code: 'server_error', message: 'The request failed.' },
}

/** A server, and an open Cloud computer tab over requests that can wait. */
async function openTab() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const model = new OrgModel(testServices(server, { fetch: held.fetch }), org)
  const computer = new ComputerModel(model, new ManualDelay().delay)
  computer.start()
  await flushMicrotasks()
  return { server, held, model, computer }
}

/** The bodies of the saves that the server got, in their order. */
function saves(server: FakeApiServer): Promise<unknown[]> {
  return Promise.all(
    server.requests
      .filter((request) => request.method === 'PATCH')
      .map((request) => request.clone().json()),
  )
}

describe('settings saves', () => {
  test('an install save and a startup save go out one at a time, so the later save stays', async () => {
    const { server, held, computer } = await openTab()
    // The server saves the install script at once, and its answer is late.
    server.json('PATCH', settingsPath, installed)
    held.holdAnswer('PATCH', settingsPath)
    const install = computer.saveScript(
      'installScript',
      installed.settings.installScript,
    )
    await flushMicrotasks()
    server.json('PATCH', settingsPath, both)
    const startup = computer.saveScript('startupScript', 'npm run dev')
    await flushMicrotasks()
    held.release('PATCH', settingsPath)
    await Promise.all([install, startup])
    expect({
      sent: await saves(server),
      settings: computer.settings.get(),
    }).toEqual({
      sent: [
        { installScript: installed.settings.installScript },
        { startupScript: 'npm run dev' },
      ],
      settings: { state: 'ready', value: both.settings },
    })
    computer.stop()
  })

  test('a save that waits while the tab closes shows in the tab that opens again', async () => {
    const { server, held, model, computer } = await openTab()
    held.hold('PATCH', settingsPath)
    const saving = computer.saveScript(
      'installScript',
      installed.settings.installScript,
    )
    computer.stop()
    // The reopened tab reads the settings before the server sees the save.
    const reopened = new ComputerModel(model, new ManualDelay().delay)
    reopened.start()
    await flushMicrotasks()
    server.json('PATCH', settingsPath, installed)
    held.release('PATCH', settingsPath)
    await saving
    expect(reopened.settings.get()).toEqual({
      state: 'ready',
      value: installed.settings,
    })
    reopened.stop()
  })

  test('a failed save rejects its own caller, and the save after it still goes out', async () => {
    const { server, held, computer } = await openTab()
    const outcomes: string[] = []
    const settle = (name: string, saving: Promise<void>) =>
      saving.then(
        () => outcomes.push(`${name} saved`),
        (error: unknown) =>
          outcomes.push(
            `${name} failed: ${error instanceof ApiError ? error.code : 'unknown'}`,
          ),
      )
    server.json('PATCH', settingsPath, refused, 500)
    held.holdAnswer('PATCH', settingsPath)
    void settle(
      'install',
      computer.saveScript('installScript', installed.settings.installScript),
    )
    await flushMicrotasks()
    server.json('PATCH', settingsPath, both)
    void settle('startup', computer.saveScript('startupScript', 'npm run dev'))
    await flushMicrotasks()
    // The startup save waits for the answer of the install save.
    expect(await saves(server)).toHaveLength(1)
    held.release('PATCH', settingsPath)
    await flushMicrotasks()
    expect({
      outcomes,
      sent: (await saves(server)).length,
      settings: computer.settings.get(),
    }).toEqual({
      outcomes: ['install failed: server_error', 'startup saved'],
      sent: 2,
      settings: { state: 'ready', value: both.settings },
    })
    computer.stop()
  })
})
