import { expect, it } from 'vitest'

import {
  PROVIDER_STOP_START_KEY,
  PROVIDER_STOP_START_ALARM,
} from '../chat/provider-stop-start'
import { chatKey } from '../chat/storage-keys'
import { TurnLifecycle } from '../chat/turn-lifecycle'
import { isRecord } from '../http'
import { suspendOrg } from '../operator/suspend-org'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { runningProviderStopFixture } from './provider-stop-native.test-support'
import { START_JOB_KEY } from './start-storage'
import { advanceToRunner } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

async function stoppedDuringTurn() {
  const fixture = fixtureForTest()
  const saved = await runningProviderStopFixture(fixture)
  await saved.actor.native.api.peers.receiveRunner('runner', {
    type: 'event',
    streamId: '12345678-1234-4234-8234-123456789abc',
    eventNumber: 2,
    occurredAt: fixture.runtime.dependencies.now(),
    event: {
      type: 'turn.started',
      sessionId: `${saved.id}-session`,
      turnId: `${saved.id}-turn`,
      senderId: fixture.user.id,
      choice: FIRST_MESSAGE.choice,
      startedAt: fixture.runtime.dependencies.now(),
      messageIds: [FIRST_MESSAGE.id],
    },
  })
  fixture.boat.states.set(saved.sandboxId, 'archived')
  await saved.actor.endpoint().lifecycleActivity()
  await saved.actor.native.api.controls.drainBackground()
  return { ...fixture, ...saved }
}

it('keeps the start due across eviction and queues a resume for the original sender outside the chat stop', async () => {
  const fixture = await stoppedDuringTurn()
  expect(await fixture.actor.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
  })
  expect(
    await fixture.actor.storage.get(PROVIDER_STOP_START_KEY),
  ).toMatchObject({ senderId: fixture.user.id })
  expect(fixture.boat.resumeIds).toEqual([])
  await fixture.actor.restart()
  await fixture.advanceTo(fixture.runtime.dependencies.now(), fixture.id)
  expect(await fixture.actor.storage.get(START_JOB_KEY)).toMatchObject({
    kind: 'resume',
    requestedByUserId: fixture.user.id,
    allocatedSandboxId: fixture.sandboxId,
  })
  expect(
    await fixture.actor.storage.get(PROVIDER_STOP_START_KEY),
  ).toBeUndefined()
  const start = fixture.starts.get(fixture.id)
  if (!start) throw new Error('Missing automatic resume owner')
  await advanceToRunner(start)
  await fixture.actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  await fixture.advanceTo(fixture.runtime.dependencies.now(), fixture.id)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: true })
  expect(fixture.boat.resumeIds).toEqual([fixture.sandboxId])
  expect(await fixture.actor.endpoint().readLifecycle()).toMatchObject({
    state: 'ready',
  })
})

it('retains the durable automatic start after a transient read failure and resumes from its later alarm', async () => {
  const fixture = await stoppedDuringTurn()
  const due = await fixture.actor.storage.get<{ turnIds: string[] }>(
    PROVIDER_STOP_START_KEY,
  )
  if (!due) throw new Error('Missing durable start')
  let failing = true
  await fixture.actor.native.configure({
    hooks: {
      afterRead: async (key) => {
        if (failing && key === chatKey('turn', due.turnIds[0]))
          throw new Error('Continuation read unavailable')
      },
    },
  })
  const now = fixture.runtime.dependencies.now()
  await expect(fixture.advanceTo(now, fixture.id)).rejects.toThrowError(
    'Continuation read unavailable',
  )
  expect(await fixture.actor.storage.get(PROVIDER_STOP_START_KEY)).toEqual(due)
  expect(await fixture.actor.storage.get(START_JOB_KEY)).toBeUndefined()
  expect(
    await fixture.actor.storage.get(`alarm:${PROVIDER_STOP_START_ALARM}`),
  ).toBe(now + 30_000)
  failing = false
  await fixture.actor.restart()
  await fixture.advanceTo(now + 30_000, fixture.id)
  expect(await fixture.actor.storage.get(START_JOB_KEY)).toMatchObject({
    kind: 'resume',
    requestedByUserId: fixture.user.id,
  })
  expect(
    await fixture.actor.storage.get(PROVIDER_STOP_START_KEY),
  ).toBeUndefined()
})

it('keeps the automatic start while the workspace row still waits for its stopped projection', async () => {
  const fixture = await stoppedDuringTurn()
  const due = await fixture.actor.storage.get(PROVIDER_STOP_START_KEY)
  const row = (state: string) =>
    fixture.runtime.env.DB.prepare(
      'UPDATE workspaces SET state = ? WHERE id = ?',
    )
      .bind(state, fixture.id)
      .run()
  await row('ready')
  const now = fixture.runtime.dependencies.now()
  await fixture.advanceTo(now, fixture.id)
  expect(await fixture.actor.storage.get(PROVIDER_STOP_START_KEY)).toEqual(due)
  expect(await fixture.actor.storage.get(START_JOB_KEY)).toBeUndefined()
  await row('stopped')
  await fixture.advanceTo(now + 30_000, fixture.id)
  expect(await fixture.actor.storage.get(START_JOB_KEY)).toMatchObject({
    kind: 'resume',
    requestedByUserId: fixture.user.id,
  })
})

it('drops the automatic start when Stop cancels the queued continuation before the alarm', async () => {
  const fixture = await stoppedDuringTurn()
  await fixture.actor.native.api.chat.changeWorkspace(
    fixture.id,
    async (view) => {
      const session = await view.session(`${fixture.id}-session`)
      if (!session?.activeTurnId)
        throw new Error('Missing continuation session')
      await new TurnLifecycle(view, session).stop(
        session.activeTurnId,
        'cancel-continuation',
      )
    },
  )
  await fixture.advanceTo(fixture.runtime.dependencies.now(), fixture.id)
  expect(
    await fixture.actor.storage.get(PROVIDER_STOP_START_KEY),
  ).toBeUndefined()
  expect(await fixture.actor.storage.get(START_JOB_KEY)).toBeUndefined()
  expect(fixture.boat.resumeIds).toEqual([])
  expect(await fixture.actor.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
  })
})

it('drops a refused automatic start with a warning and leaves the continuation queued', async () => {
  const fixture = await stoppedDuringTurn()
  const controls = fixture.actor.native.api.controls
  await suspendOrg(fixture.runtime, fixture.org.id, fixture.user.id)
  await controls.captureWarnings(true)
  try {
    await fixture.advanceTo(fixture.runtime.dependencies.now(), fixture.id)
    expect(
      await fixture.actor.storage.get(PROVIDER_STOP_START_KEY),
    ).toBeUndefined()
    expect(fixture.boat.resumeIds).toEqual([])
    const queued = await fixture.actor.native.api.chat.store.read(
      fixture.id,
      async (view) =>
        (await view.turns()).filter((turn) => turn.state === 'queued'),
    )
    expect(queued).toHaveLength(1)
    const warnings = (await controls.warningCalls()).filter(
      ([value]) =>
        isRecord(value) && value.kind === 'workspace_provider_resume_refused',
    )
    expect(warnings).toEqual([
      [
        {
          kind: 'workspace_provider_resume_refused',
          message:
            'The automatic resume after a provider stop was refused. The turn remains queued.',
          workspaceId: 'unknown',
          error: { kind: 'http', status: 403, code: 'org_suspended' },
        },
      ],
    ])
  } finally {
    await controls.captureWarnings(false)
  }
})
