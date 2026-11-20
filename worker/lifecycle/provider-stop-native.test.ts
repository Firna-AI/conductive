import { expect, it } from 'vitest'

import { isRecord } from '../http'
import { liftOrgSuspension } from '../operator/lift'
import { suspendOrg } from '../operator/suspend-org'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { LIFECYCLE_STATE_KEY, TURN_HEARTBEAT_MS } from './durable-types'
import { runningProviderStopFixture } from './provider-stop-native.test-support'

const fixtureForTest = setupBackendTests()

it('logs the provider account and current runner once for a saved stop during a turn', async () => {
  const fixture = fixtureForTest()
  const { id, actor, sandboxId } = await runningProviderStopFixture(fixture)
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'working',
    runningSessions: [`${id}-session`],
  })
  await fixture.advanceTo(fixture.runtime.dependencies.now() + 5_000, id)
  const controls = actor.native.api.controls
  await controls.captureWarnings(true)
  try {
    fixture.boat.states.set(sandboxId, 'archived')
    const at = fixture.runtime.dependencies.now() + TURN_HEARTBEAT_MS
    await fixture.advanceTo(at, id)
    expect(await actor.endpoint().readLifecycle()).toMatchObject({
      state: 'stopped',
      providerStop: { at },
      stoppedAt: at,
      runningSessions: [],
    })
    await actor.restart()
    await actor.endpoint().acknowledgeLifecycleFirstMessage()
    const warnings = (await controls.warningCalls()).filter(
      ([value]) =>
        isRecord(value) && value.kind === 'workspace_provider_stopped',
    )
    expect(warnings).toEqual([
      [
        {
          kind: 'workspace_provider_stopped',
          message: 'A sandbox provider stopped a workspace during a turn.',
          workspaceId: 'unknown',
          providerAccount: 'boat',
          connectionId: 'unknown',
          streamId: '12345678-1234-4234-8234-123456789abc',
          processStartId: 'abcdef01-2345-4678-89ab-cdef01234567',
          protocolVersion: 2,
        },
      ],
    ])
  } finally {
    await controls.captureWarnings(false)
  }
})

it('saves suspension stop intent before dispatch and excludes its later provider confirmation after restart', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user } = fixture
  const { id, actor, sandboxId } = await runningProviderStopFixture(fixture)
  const stopAt = runtime.dependencies.now()
  const fetch = runtime.dependencies.fetch
  const stop = boatRoute({ operation: 'stop', sandboxId })
  const intents: unknown[] = []
  runtime.dependencies.fetch = async (request) => {
    if (
      request.method === stop.method &&
      new URL(request.url).pathname.endsWith(stop.path)
    )
      intents.push(await actor.storage.get(LIFECYCLE_STATE_KEY))
    return fetch(request)
  }
  fixture.boat.stopReplyState = 'ready'
  expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
    pendingWorkspaceIds: [id],
  })
  expect(intents).toHaveLength(1)
  expect(intents[0]).toMatchObject({
    appStop: { at: stopAt },
    runningSessions: [`${id}-session`],
  })
  await liftOrgSuspension(runtime, org.id, user.id)
  await actor.restart()
  await actor.endpoint().runnerLifecycleDisconnected()
  fixture.boat.states.set(sandboxId, 'archived')
  const deadlines = fixture.boat.deadlineIds.length
  await fixture.setTime(stopAt + 5_000)
  await actor.endpoint().lifecycleActivity()
  await actor.native.api.controls.drainBackground()
  expect(fixture.boat.deadlineIds.slice(deadlines)).toEqual([sandboxId])
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    stoppedAt: stopAt + 5_000,
    appStop: { at: stopAt },
    providerStop: undefined,
  })
})
