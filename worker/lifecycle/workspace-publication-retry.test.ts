import { afterEach, expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { IDLE_MS } from './durable-types'
import { startRetryFixture } from './retry-test-support'
import { advanceToRunner } from './start-resume-test-support'
import { resumeWorkspace } from './workspace-resume'
import { workspaceTaskAlarms } from './workspace-task-alarms'

const fixtureForTest = setupBackendTests()

afterEach(async () => {
  await fixtureForTest()
    .runtime.env.DB.prepare('DROP TRIGGER IF EXISTS fail_creation_publication')
    .run()
})

async function completedCreationWithBlockedPublication() {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  await advanceToRunner(start)
  const job = await start.job()
  if (!job) throw new Error('The start job is missing.')
  const actor = fixture.actors.get(job.workspaceId)
  if (!actor) throw new Error('The workspace controller is missing.')
  const publicationState = () =>
    fixture.runtime.env.DB.prepare(
      'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
    )
      .bind(job.workspaceId)
      .first('state')
  await fixture.runtime.env.DB.prepare(
    `CREATE TRIGGER fail_creation_publication BEFORE UPDATE ON workspace_creation_attempts
     WHEN NEW.state = 'succeeded'
     BEGIN SELECT RAISE(ABORT, 'creation publication failed'); END`,
  ).run()
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  const completedAt = fixture.runtime.dependencies.now()
  await start.tick(completedAt)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: true })
  expect(await publicationState()).toBe('pending')
  const state = await start.endpoint.readLifecycle()
  const idleAt = (state?.lastActivityAt ?? 0) + IDLE_MS
  const fireOnceAt = async (at: number) => {
    fixture.setTime(at)
    await start.storage.deleteAlarm()
    await actor.endpoint().alarm()
  }
  const allowPublication = () =>
    fixture.runtime.env.DB.prepare(
      'DROP TRIGGER fail_creation_publication',
    ).run()
  return {
    fixture,
    start,
    job,
    actor,
    completedAt,
    idleAt,
    publicationState,
    fireOnceAt,
    allowPublication,
  }
}

async function queuedResumeWithBlockedPublication() {
  const context = await completedCreationWithBlockedPublication()
  const { fixture, start, job, idleAt, publicationState, fireOnceAt } = context
  await fireOnceAt(idleAt)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(await publicationState()).toBe('pending')
  const response = await resumeWorkspace(
    fixture.runtime,
    fixture.org.id,
    job.workspaceId,
    fixture.user.id,
  )
  expect(response.workspace.state).toBe('starting')
  expect(await start.job()).toMatchObject({ kind: 'resume', phase: 'machine' })
  expect(await publicationState()).toBe('pending')
  return context
}

it('keeps the original idle alarm after a stored creation result retries its D1 publication', async () => {
  const {
    fixture,
    start,
    completedAt,
    idleAt,
    publicationState,
    allowPublication,
  } = await completedCreationWithBlockedPublication()
  await allowPublication()
  start.restart()
  await start.tick(completedAt + 1_000)
  expect(await publicationState()).toBe('succeeded')
  expect(start.storage.alarmAt).toBe(completedAt + 5_000)
  await start.tick(completedAt + 5_000)
  expect(start.storage.alarmAt).toBe(idleAt)
  await start.tick(idleAt - 1)
  expect(fixture.boat.stopIds).toEqual([])
  await start.tick(idleAt)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
})

it('stops at the original idle deadline while the completed creation still needs publication', async () => {
  const {
    fixture,
    start,
    completedAt,
    idleAt,
    publicationState,
    fireOnceAt,
    allowPublication,
  } = await completedCreationWithBlockedPublication()
  start.restart()
  await start.tick(completedAt + 1_000)
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(completedAt + 2_000)
  await fireOnceAt(idleAt - 1)
  expect(fixture.boat.stopIds).toEqual([])
  expect(start.storage.alarmAt).toBe(idleAt)
  await fireOnceAt(idleAt)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  const stopped = await start.endpoint.readLifecycle()
  expect(stopped).toMatchObject({ state: 'stopped', stoppedAt: idleAt })
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(idleAt + 999)
  await allowPublication()
  start.restart()
  await start.tick(idleAt + 1_000)
  expect(await publicationState()).toBe('succeeded')
  expect(start.storage.alarmAt).toBe(stopped?.nextDiskKeepaliveAt)
  expect(await start.endpoint.readLifecycle()).toEqual(stopped)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
})

it('retains an older creation publication retry after a resume completes', async () => {
  const { fixture, start, actor, publicationState, allowPublication } =
    await queuedResumeWithBlockedPublication()
  await advanceToRunner(start)
  const resumedAt = fixture.runtime.dependencies.now()
  expect(start.storage.alarmAt).toBe(resumedAt + 1_000)
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(resumedAt)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: true })
  expect(await publicationState()).toBe('pending')
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  expect(start.storage.alarmAt).toBe(resumedAt + 1_000)
  const resumed = await start.endpoint.readLifecycle()
  start.restart()
  await start.tick(resumedAt + 1_000)
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(resumedAt + 2_000)
  await allowPublication()
  start.restart()
  await start.tick(resumedAt + 2_000)
  expect(await publicationState()).toBe('succeeded')
  expect(await start.endpoint.readLifecycle()).toEqual(resumed)
  expect(start.storage.alarmAt).toBe(resumedAt + 5_000)
  await start.tick(resumedAt + 5_000)
  expect(start.storage.alarmAt).toBe((resumed?.lastActivityAt ?? 0) + IDLE_MS)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
})

it('recovers publication during runner wait without moving the resume deadline', async () => {
  const { fixture, start, actor, idleAt, publicationState, allowPublication } =
    await queuedResumeWithBlockedPublication()
  await advanceToRunner(start)
  const waitingAt = fixture.runtime.dependencies.now()
  expect(await start.job()).toMatchObject({
    phase: 'runner',
    deadlineAt: idleAt + 1_200_000,
  })
  expect(start.storage.alarmAt).toBe(waitingAt + 1_000)
  await allowPublication()
  start.restart()
  await start.tick(waitingAt + 1_000)
  expect(await publicationState()).toBe('succeeded')
  expect(await start.job()).toMatchObject({
    phase: 'runner',
    deadlineAt: idleAt + 1_200_000,
  })
  expect(start.storage.alarmAt).toBe(idleAt + 1_200_000)
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(waitingAt + 1_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: true })
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
})

it('stops a suspended owner while the completed creation still needs publication', async () => {
  const { fixture, start, job, actor, completedAt, publicationState } =
    await completedCreationWithBlockedPublication()
  await fixture.runtime.env.DB.prepare(
    'UPDATE users SET suspended_at = ? WHERE id = ?',
  )
    .bind(completedAt, fixture.user.id)
    .run()
  expect(
    await actor.endpoint().suspendLifecycle(job.workspaceId, fixture.user.id),
  ).toBe(true)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(await start.endpoint.readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
  })
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(completedAt + 1_000)
})

it('recovers a stored creation publication from a legacy lifecycle alarm', async () => {
  const {
    fixture,
    start,
    completedAt,
    idleAt,
    publicationState,
    fireOnceAt,
    allowPublication,
  } = await completedCreationWithBlockedPublication()
  const alarms = workspaceTaskAlarms(start.storage)
  await alarms.set('lifecycle:publication', null)
  await alarms.set('lifecycle', completedAt + 1_000)
  start.restart()
  await fireOnceAt(completedAt + 1_000)
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(completedAt + 2_000)
  await allowPublication()
  start.restart()
  await start.tick(completedAt + 2_000)
  expect(await publicationState()).toBe('succeeded')
  expect(start.storage.alarmAt).toBe(completedAt + 5_000)
  await start.tick(completedAt + 5_000)
  expect(start.storage.alarmAt).toBe(idleAt)
  expect(fixture.boat.stopIds).toEqual([])
})

it('releases start and publication alarms after archive removes their records', async () => {
  const { start, actor } = await queuedResumeWithBlockedPublication()
  const alarms = workspaceTaskAlarms(start.storage)
  expect(await alarms.has('lifecycle:start')).toBe(true)
  expect(await alarms.has('lifecycle:publication')).toBe(true)
  // Archive removes these records before it clears lifecycle state.
  await start.storage.delete([
    'lifecycle:start-job',
    'lifecycle:create-publication',
  ])
  actor.endpoint().cancelLifecycleWaiters()
  await actor.endpoint().clearLifecycle()
  expect(await alarms.has('lifecycle:start')).toBe(false)
  expect(await alarms.has('lifecycle:publication')).toBe(false)
  expect(start.storage.alarmAt).toBeNull()
})
