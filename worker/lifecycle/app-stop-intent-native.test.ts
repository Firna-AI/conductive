import { expect, it } from 'vitest'

import { archiveActions } from './archive-test-support'
import { captureAppStopDispatches } from './app-stop-native.test-support'
import { setupBackendTests } from './backend-test-hooks'
import { resumedStartup } from './start-resume-test-support'
import { runningProviderStopFixture } from './provider-stop-native.test-support'

const fixtureForTest = setupBackendTests()

it('persists failed-start stop intent before its pending cleanup dispatches after restart', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing resume job')
  const actor = fixture.actors.get(job.workspaceId)
  if (!actor) throw new Error('Missing workspace actor')
  const intents = captureAppStopDispatches(fixture, actor, 'bx_1')
  const stopAt = fixture.runtime.dependencies.now() + 1_000
  fixture.boat.commandExitCode = 1
  fixture.boat.failStop = true
  await start.tick(stopAt)
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'error',
    startStop: 'pending',
    appStop: { at: stopAt },
    providerStop: undefined,
  })
  expect(intents).toMatchObject([{ appStop: { at: stopAt } }])
  await actor.restart()
  fixture.boat.failStop = false
  await fixture.advanceTo(stopAt + 30_000, job.workspaceId)
  expect(fixture.boat.stopIds).toEqual(['bx_1', 'bx_1'])
  expect(intents).toMatchObject([
    { appStop: { at: stopAt } },
    { appStop: { at: stopAt } },
  ])
  expect(fixture.boat.states.get('bx_1')).toBe('archived')
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'error',
    startStop: 'stopped',
    appStop: { at: stopAt },
    providerStop: undefined,
  })
})

it('retains Archive stop intent when Restore leaves its provider stop pending', async () => {
  const fixture = fixtureForTest()
  const saved = await runningProviderStopFixture(fixture)
  const { id, actor, sandboxId } = saved
  const actions = archiveActions(fixture, id, actor)
  const intents = captureAppStopDispatches(fixture, actor, sandboxId)
  const stopAt = fixture.runtime.dependencies.now()
  fixture.boat.stopReplyState = 'ready'
  await actions.archive()
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'archived',
    appStop: { at: stopAt },
    runningSessions: [],
  })
  await actor.restart()
  expect(await actions.restore()).toMatchObject({ ok: true })
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    startStop: 'pending',
    appStop: { at: stopAt },
    providerStop: undefined,
  })
  const dispatched = fixture.boat.stopIds.length
  await actor.restart()
  fixture.boat.stopReplyState = 'archived'
  await fixture.advanceTo(stopAt + 30_000, id)
  expect(fixture.boat.stopIds.slice(dispatched)).toEqual([sandboxId])
  expect(intents.at(-1)).toMatchObject({ appStop: { at: stopAt } })
  expect(fixture.boat.states.get(sandboxId)).toBe('archived')
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    startStop: 'stopped',
    appStop: { at: stopAt },
    providerStop: undefined,
  })
})
