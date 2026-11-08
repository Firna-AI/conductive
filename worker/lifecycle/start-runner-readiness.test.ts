import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { recordOrgSuspension } from '../operator/org-data'
import { suspendUser } from '../operator/suspend-user'
import { joinedMember } from '../operator/suspension-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture } from './retry-test-support'
import { advanceToRunner, resumedStartup } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

it('keeps the create pending through runner readiness and fails at its original deadline', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const before = await start.job()
  if (!before) throw new Error('Missing create job')
  const actor = fixture.actors.get(before.workspaceId)?.endpoint()
  if (!actor) throw new Error('Missing workspace actor')
  await advanceToRunner(start)
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
  await advanceToRunner(start)
  const runnerAt = fixture.runtime.dependencies.now()
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  const commands = fixture.boat.commandRequests.length
  await start.tick(runnerAt + 1_000)
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  expect(fixture.boat.commandRequests).toHaveLength(commands)
  await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(runnerAt + 2_000)
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
    await advanceToRunner(start)
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

it('saves org suspension at runner readiness before native stop reconciliation', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  await advanceToRunner(start)
  const now = fixture.runtime.dependencies.now()
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  await recordOrgSuspension(
    fixture.runtime.env.DB,
    fixture.org.id,
    fixture.user.id,
    now,
  )
  await expect(
    start.actor.reportRunnerLifecycle({ type: 'runner.ready' }),
  ).resolves.toBeUndefined()
  expect(await start.job()).toMatchObject({
    phase: 'runner',
    cancelled: true,
    failure: {
      code: 'org_suspended',
      status: 403,
      timeLimit: false,
      message:
        'This org is suspended. For questions, write to abuse@conductive.build.',
    },
  })
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'starting',
    runnerConnected: false,
  })
  start.restart()
  await start.tick(now + 1_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'org_suspended' },
  })
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
  })
  expect(fixture.boat.states.get('bx_1')).toBe('archived')
  expect(start.storage.alarmAt).toBeNull()
})
