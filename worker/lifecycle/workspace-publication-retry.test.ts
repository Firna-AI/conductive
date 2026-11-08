import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { IDLE_MS } from './durable-types'
import { startRetryFixture } from './retry-test-support'
import { advanceToRunner } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

it('keeps the original idle alarm after a stored creation result retries its D1 publication', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  await advanceToRunner(start)
  const job = await start.job()
  if (!job) throw new Error('The start job is missing.')
  const actor = fixture.actors.get(job.workspaceId)
  if (!actor) throw new Error('The workspace controller is missing.')
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
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
    )
      .bind(job.workspaceId)
      .first('state'),
  ).toBe('pending')
  await fixture.runtime.env.DB.prepare(
    'DROP TRIGGER fail_creation_publication',
  ).run()
  start.restart()
  await start.tick(completedAt + 1_000)
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
    )
      .bind(job.workspaceId)
      .first('state'),
  ).toBe('succeeded')
  const state = await start.endpoint.readLifecycle()
  const idleAt = (state?.lastActivityAt ?? 0) + IDLE_MS
  expect(start.storage.alarmAt).toBe(idleAt)
  await start.tick(idleAt - 1)
  expect(fixture.boat.stopIds).toEqual([])
  await start.tick(idleAt)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
})

it('stops at the original idle deadline while the completed creation still needs publication', async () => {
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
  start.restart()
  await start.tick(completedAt + 1_000)
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(completedAt + 2_000)
  const state = await start.endpoint.readLifecycle()
  const idleAt = (state?.lastActivityAt ?? 0) + IDLE_MS
  const fireOnceAt = async (at: number) => {
    fixture.setTime(at)
    await start.storage.deleteAlarm()
    await actor.endpoint().alarm()
  }
  await fireOnceAt(idleAt - 1)
  expect(fixture.boat.stopIds).toEqual([])
  expect(start.storage.alarmAt).toBe(idleAt)
  await fireOnceAt(idleAt)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  const stopped = await start.endpoint.readLifecycle()
  expect(stopped).toMatchObject({ state: 'stopped', stoppedAt: idleAt })
  expect(await publicationState()).toBe('pending')
  expect(start.storage.alarmAt).toBe(idleAt + 1_000)
  await fixture.runtime.env.DB.prepare(
    'DROP TRIGGER fail_creation_publication',
  ).run()
  start.restart()
  await start.tick(idleAt + 1_000)
  expect(await publicationState()).toBe('succeeded')
  expect(start.storage.alarmAt).toBe(stopped?.nextDiskKeepaliveAt)
  expect(await start.endpoint.readLifecycle()).toEqual(stopped)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
})
