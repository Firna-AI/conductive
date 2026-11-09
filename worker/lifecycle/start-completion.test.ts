import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import type { backendFixture } from './backend-test-support'
import { IDLE_MS } from './durable-types'
import { startRetryFixture } from './retry-test-support'
import { START_JOB_KEY } from './start-storage'
import { advanceToRunner } from './start-resume-test-support'

const fixtureForTest = setupBackendTests()

async function savedRunnerPhase(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
  const start = await startRetryFixture(fixture)
  const saved = await start.storage.get('job', START_JOB_KEY)
  if (!saved || saved.phase === 'records')
    throw new Error('Missing running start checkpoint')
  const platform = fixture.actors.get(saved.workspaceId)
  if (!platform) throw new Error('Missing start controller')
  await platform
    .endpoint()
    .lifecycleStep('startup', 'Applying your startup script', 'completed')
  await start.storage.put('job', START_JOB_KEY, {
    ...saved,
    phase: 'runner',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  platform.restart()
  return { ...start, platform, id: saved.workspaceId }
}

it('prepares a restored runner checkpoint before success and preserves its completed readiness step', async () => {
  const fixture = fixtureForTest()
  const start = await savedRunnerPhase(fixture)
  await start.platform
    .endpoint()
    .reportRunnerLifecycle({ type: 'runner.ready' })
  const before = await start.platform.endpoint().readLifecycle()
  expect(before).toMatchObject({ state: 'starting', startupPrepared: false })
  const completed = before?.start?.steps.find((step) => step.id === 'runner')
  await fixture.advanceTo(fixture.runtime.dependencies.now(), start.id)
  const after = await start.platform.endpoint().readLifecycle()
  expect(after).toMatchObject({ state: 'ready', startupPrepared: true })
  expect(after?.start?.steps.find((step) => step.id === 'runner')).toEqual(
    completed,
  )
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toEqual({ ok: true })
})

it('restores the running runner step before waiting without preparing an unready checkpoint', async () => {
  const fixture = fixtureForTest()
  const start = await savedRunnerPhase(fixture)
  await fixture.advanceTo(fixture.runtime.dependencies.now() + 1_000, start.id)
  const state = await start.platform.endpoint().readLifecycle()
  expect(
    state?.start?.steps.find((step) => step.id === 'runner'),
  ).toMatchObject({
    id: 'runner',
    label: 'Starting the agent',
    state: 'running',
    completedAt: null,
  })
  expect(state).toMatchObject({ state: 'starting', startupPrepared: false })
  expect(await start.job()).toMatchObject({ phase: 'runner' })
})

it('replaces the completion alarm and schedules the restore watch before the idle deadline', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing start job')
  const platform = fixture.actors.get(job.workspaceId)
  if (!platform) throw new Error('Missing start controller')
  await advanceToRunner(start)
  await platform.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  const completedAt = fixture.runtime.dependencies.now()
  await fixture.advanceTo(completedAt, job.workspaceId)
  expect(await start.job()).toBeUndefined()
  const completed = await platform.endpoint().readLifecycle()
  expect(completed).toMatchObject({ restoreWatchAt: completedAt + 5_000 })
  expect(platform.storage.alarmAt).toBe(completedAt + 5_000)
  await fixture.advanceTo(completedAt + 1_000, job.workspaceId)
  expect(platform.storage.alarmAt).toBe(completedAt + 5_000)
  await fixture.advanceTo(completedAt + 5_000, job.workspaceId)
  const state = await platform.endpoint().readLifecycle()
  expect(platform.storage.alarmAt).toBe((state?.lastActivityAt ?? 0) + IDLE_MS)
  expect(state).toMatchObject({ state: 'ready', startupPrepared: true })
})

it('does not expose readiness when the deadline is reached after startup progress', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing start job')
  const platform = fixture.actors.get(job.workspaceId)
  if (!platform) throw new Error('Missing start controller')
  await platform.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  platform.observePublication(async ({ event }) => {
    if (
      event.type === 'start.updated' &&
      event.start.steps.some(
        (step) => step.id === 'startup' && step.state === 'completed',
      )
    )
      fixture.setTime(TEST_TIME + 1_200_000)
  })
  await fixture.run(() => start.wait())
  const states = platform.events.flatMap(({ event }) =>
    event.type === 'workspace.updated' ? [event.workspace.state] : [],
  )
  expect(states).not.toContain('ready')
  expect(states).not.toContain('working')
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
})
