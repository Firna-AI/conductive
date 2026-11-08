import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { resumedStartup } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()
const deadlineAt = TEST_TIME + 1_230_000
const timeout = {
  code: 'workspace_start_failed',
  message:
    'The cloud computer did not start within the 20-minute limit. Try again.',
  log: null,
}

it('ends a timed-out resume and blocks later startup until durable stop cleanup succeeds', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  fixture.boat.commandRunning = true
  fixture.boat.failStop = true
  const commands = fixture.boat.commands.length
  await start.tick(deadlineAt)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: false, error: timeout })
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'error',
    error: timeout,
  })
  const failed = await start.actor.readLifecycle()
  await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
  expect(await start.actor.readLifecycle()).toEqual(failed)
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(await start.retry()).toBe(false)
  expect(fixture.boat.commands).toHaveLength(commands)
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  start.restart()
  await start.tick(deadlineAt + 30_000)
  expect(fixture.boat.stopIds).toEqual(['bx_1', 'bx_1'])
  expect(await start.retry()).toBe(false)
  fixture.boat.failStop = false
  await start.tick(deadlineAt + 60_000)
  expect(fixture.boat.states.get('bx_1')).toBe('archived')
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'error',
    error: timeout,
  })
  await start.tick(deadlineAt + 65_000)
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'error',
    error: timeout,
  })
  expect(await start.retry()).toBe(true)
  expect(fixture.boat.commands).toHaveLength(commands)
  await start.tick(deadlineAt + 66_000)
  expect(fixture.boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  expect(fixture.boat.stopIds).toEqual(['bx_1', 'bx_1', 'bx_1'])
})

it('keeps a failed resume after late runner readiness and permits a safe new ready attempt', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  fixture.boat.commandRunning = true
  await start.tick(deadlineAt)
  const failed = await start.actor.readLifecycle()
  await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
  expect(await start.actor.readLifecycle()).toEqual(failed)
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'error',
    runnerConnected: false,
    error: timeout,
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({ id: 'startup', state: 'failed' }),
      ]),
    },
  })
  expect(fixture.boat.states.get('bx_1')).toBe('archived')
  fixture.boat.commandRunning = false
  expect(await start.retry()).toBe(true)
  for (let phase = 0; phase < 8; phase++) {
    const job = await start.job()
    if (job?.phase === 'runner') break
    await start.advance()
  }
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  await start.actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await start.advance()
  expect(await start.wait()).toEqual({ ok: true })
  expect(await start.actor.readLifecycle()).toMatchObject({
    state: 'ready',
    runnerConnected: true,
    error: null,
  })
  const stops = fixture.boat.stopIds.length
  await start.tick(fixture.runtime.dependencies.now() + 1_000)
  expect(fixture.boat.stopIds).toHaveLength(stops)
})

it('completes cancellation while failed stops retry beyond the original resume deadline', async () => {
  const fixture = fixtureForTest()
  const start = await resumedStartup(fixture)
  fixture.boat.commandRunning = true
  fixture.boat.failStop = true
  await start.actor.lifecycleStopped()
  await start.tick(fixture.runtime.dependencies.now() + 1_000)
  expect(await start.job()).toBeUndefined()
  const cancelled = {
    ok: false,
    error: {
      code: 'workspace_start_stopped',
      message: 'The cloud computer stopped.',
      log: null,
    },
  }
  expect(await start.wait()).toEqual(cancelled)
  expect((await start.actor.readLifecycle())?.state).toBe('stopped')
  start.restart()
  await start.tick(deadlineAt + 300_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual(cancelled)
  expect(await start.retry()).toBe(false)
  fixture.boat.failStop = false
  await start.tick(deadlineAt + 330_000)
  expect(fixture.boat.states.get('bx_1')).toBe('archived')
  expect((await start.actor.readLifecycle())?.state).toBe('stopped')
  expect(await start.retry()).toBe(true)
})
