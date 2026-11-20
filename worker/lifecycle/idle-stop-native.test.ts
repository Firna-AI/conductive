import { expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { captureAppStopDispatches } from './app-stop-native.test-support'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { IDLE_MS, TURN_HEARTBEAT_MS } from './durable-types'
import {
  connectProviderStopRunner,
  runningProviderStopFixture,
} from './provider-stop-native.test-support'

const fixtureForTest = setupBackendTests()

it('saves idle stop intent before dispatch and keeps it through a pending stop and restart', async () => {
  const fixture = fixtureForTest()
  const saved = await runningProviderStopFixture(fixture)
  const { id, actor, sandboxId } = saved
  const startedAt = fixture.runtime.dependencies.now()
  await actor.native.api.peers.receiveRunner('runner', {
    type: 'event',
    streamId: '12345678-1234-4234-8234-123456789abc',
    eventNumber: 2,
    occurredAt: startedAt,
    event: {
      type: 'turn.completed',
      sessionId: `${id}-session`,
      turnId: `${id}-turn`,
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [FIRST_MESSAGE.id],
    },
  })
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'ready',
    runningSessions: [],
  })
  const intents = captureAppStopDispatches(fixture, actor, sandboxId)
  const stopAt = startedAt + IDLE_MS
  fixture.boat.stopReplyState = 'ready'
  await fixture.advanceTo(stopAt, id)
  expect(intents).toMatchObject([{ appStop: { at: stopAt } }])
  expect(fixture.boat.stopIds).toEqual([sandboxId])
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'ready',
    appStop: { at: stopAt },
    providerStop: undefined,
  })
  await actor.restart()
  await connectProviderStopRunner(
    fixture,
    saved,
    '22345678-1234-4234-8234-123456789abc',
  )
  await actor.native.api.requests.prepare('later-input', {
    url: `${fixture.runtime.env.APP_ORIGIN}${sessionPaths.messages(fixture.org.id, id, `${id}-session`)}`,
    headers: {
      Cookie: fixture.session,
      Origin: fixture.runtime.env.APP_ORIGIN,
      'Content-Type': 'application/json',
    },
    body: { ...FIRST_MESSAGE, id: 'later-input' },
  })
  expect((await actor.native.api.requests.dispatch('later-input')).status).toBe(
    202,
  )
  await actor.native.api.controls.drainBackground()
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'working',
    runningSessions: [`${id}-session`],
    appStop: { at: stopAt },
  })
  fixture.boat.states.set(sandboxId, 'archived')
  await fixture.advanceTo(stopAt + TURN_HEARTBEAT_MS, id)
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    stoppedAt: stopAt + TURN_HEARTBEAT_MS,
    appStop: { at: stopAt },
    providerStop: undefined,
    runningSessions: [],
  })
  expect(fixture.boat.resumeIds).toEqual([])
})
