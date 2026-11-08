import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { suspendUser } from '../operator/suspend-user'
import { joinedMember } from '../operator/suspension-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture } from './retry-test-support'
import { resumedStartup } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

it('keeps the create pending through runner readiness and fails at its original deadline', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const before = await start.job()
  if (!before) throw new Error('Missing create job')
  const actor = fixture.actors.get(before.workspaceId)?.endpoint()
  if (!actor) throw new Error('Missing workspace actor')
  await start.tick(fixture.runtime.dependencies.now() + 1_000)
  expect(await start.job()).toMatchObject({
    phase: 'runner',
    deadlineAt: TEST_TIME + 1_200_000,
  })
  expect(start.storage.alarmAt).toBe(TEST_TIME + 1_200_000)
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
    )
      .bind(before.workspaceId)
      .first('state'),
  ).toBe('pending')
  const commands = fixture.boat.commandRequests.length
  const polls = fixture.boat.statusRequests.length
  start.restart()
  await start.tick(TEST_TIME + 1_199_999)
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  expect(fixture.boat.commandRequests).toHaveLength(commands)
  expect(fixture.boat.statusRequests).toHaveLength(polls)
  fixture.setTime(TEST_TIME + 1_200_000)
  await actor.reportRunnerLifecycle({ type: 'runner.ready' })
  expect((await actor.readLifecycle())?.state).toBe('starting')
  await start.tick(TEST_TIME + 1_200_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    (await fixture.failedCreation(before.workspaceId))?.error.message,
  ).toBe(
    'The cloud computer did not start within the 20-minute limit. Try again.',
  )
})

it('completes a resume only after runner readiness without rerunning its startup script', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  const startupAt = fixture.runtime.dependencies.now()
  await start.tick(startupAt + 1_000)
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  const commands = fixture.boat.commandRequests.length
  await start.tick(startupAt + 2_000)
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  expect(fixture.boat.commandRequests).toHaveLength(commands)
  await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(startupAt + 3_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: true })
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'ready',
    runnerConnected: true,
    startupPrepared: true,
    error: null,
  })
  expect(fixture.boat.commandRequests).toHaveLength(commands)
})

it.each(['alarm', 'report'] as const)(
  'preserves caller suspension during the runner wait at the next %s',
  async (boundary) => {
    const fixture = fixtureForTest()
    const member = await joinedMember(fixture)
    const start = await resumedStartup(fixture, member.id)
    await start.tick(fixture.runtime.dependencies.now() + 1_000)
    expect(await start.job()).toMatchObject({ phase: 'runner' })
    await suspendUser(fixture.runtime, member.githubId, fixture.user.id)
    if (boundary === 'report') {
      await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
    } else {
      await start.storage.setAlarm(fixture.runtime.dependencies.now() + 1_000)
    }
    expect((await start.actor.readLifecycle())?.state).toBe('starting')
    await start.tick(fixture.runtime.dependencies.now() + 1_000)
    expect(await start.job()).toBeUndefined()
    expect(await start.wait()).toMatchObject({
      ok: false,
      error: { code: 'user_suspended' },
    })
    expect(await start.actor.readLifecycle()).toMatchObject({
      state: 'stopped',
      runnerConnected: false,
    })
    expect(fixture.boat.states.get('bx_1')).toBe('archived')
  },
)
