import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture, statusFault } from './retry-test-support'
import { START_JOB_KEY } from './start-storage'

const backendFixture = setupBackendTests()
const FAILURE =
  'The cloud computer did not start within the 20-minute limit. Try again.'

it('ends a startup script that never exits at the original start deadline and publishes the existing failed-create events', async () => {
  const fixture = await backendFixture()
  const start = await startRetryFixture(fixture)
  fixture.boat.commandRunning = true
  fixture.boat.commandOutput = 'unfinished startup output\n'
  await start.tick(TEST_TIME + 1_199_999)
  const before = await start.job()
  const alarm = start.storage.alarmAt
  start.restart()
  await start.tick(TEST_TIME + 1_200_000)

  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed', message: FAILURE },
  })
  expect(before).toMatchObject({ phase: 'startup' })
  expect(alarm).toBe(TEST_TIME + 1_200_000)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(0)
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_tokens',
    ).first('count'),
  ).toBe(0)
  const actor = [...fixture.actors.values()][0]
  expect(actor?.events.map(({ event }) => event)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'workspace.updated',
        workspace: expect.objectContaining({ state: 'error' }),
        error: { code: 'workspace_start_failed', message: FAILURE },
      }),
      expect.objectContaining({
        type: 'start.updated',
        start: expect.objectContaining({
          steps: expect.arrayContaining([
            expect.objectContaining({ id: 'startup', state: 'failed' }),
          ]),
        }),
      }),
    ]),
  )
  expect(
    (await fixture.failedCreation(before?.workspaceId ?? ''))?.error.message,
  ).toBe(FAILURE)
})

it('gives each resume its own deadline and restores an old saved start when its computer never becomes ready', async () => {
  const fixture = await backendFixture()
  const start = await startRetryFixture(fixture)
  const base = await start.job()
  if (!base) throw new Error('Missing original start')
  await start.tick(fixture.runtime.dependencies.now() + 1_000)
  await fixture.actors
    .get(base.workspaceId)
    ?.endpoint()
    .reportRunnerLifecycle({ type: 'runner.ready' })
  expect(await fixture.run(() => start.wait())).toEqual({ ok: true })
  await start.endpoint.lifecycleStopped()
  fixture.boat.states.set('bx_1', 'archived')
  fixture.setTime(TEST_TIME + 300_000)
  const endpoint = fixture.runtime.workspace(base.workspaceId)
  expect(
    await endpoint.queueLifecycleStart({
      ...base,
      kind: 'resume',
      admission: undefined,
      creation: undefined,
      phase: 'machine',
      attempt: 'time-limited-resume',
      allocatedSandboxId: 'bx_1',
      processId: null,
    }),
  ).toBe(true)
  await start.tick(TEST_TIME + 301_000)
  fixture.boat.states.set('bx_1', 'provisioning')
  await start.tick(TEST_TIME + 1_499_999)
  const before = await start.job()
  const alarm = start.storage.alarmAt
  const legacy = await start.storage.get('job', START_JOB_KEY)
  if (!legacy) throw new Error('Missing saved resume')
  delete legacy.deadlineAt
  await start.storage.put('job', START_JOB_KEY, legacy)
  start.restart()
  await start.tick(TEST_TIME + 1_500_000)

  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed', message: FAILURE },
  })
  expect(before).toMatchObject({ phase: 'ready', kind: 'resume' })
  expect(alarm).toBe(TEST_TIME + 1_500_000)
  expect(
    await fixture.runtime.workspace(base.workspaceId).readLifecycle(),
  ).toMatchObject({ state: 'error', error: { message: FAILURE } })
  expect(
    fixture.actors.get(base.workspaceId)?.events.at(-2)?.event,
  ).toMatchObject({
    type: 'workspace.updated',
    workspace: { state: 'error' },
    error: { code: 'workspace_start_failed', message: FAILURE },
  })
  expect(fixture.boat.deletedIds).toEqual([])
})

it('enforces the start deadline before a later provider retry after reconstruction', async () => {
  const fixture = await backendFixture()
  const start = await startRetryFixture(fixture)
  const fault = statusFault(fixture)
  fault.fail('60')
  await start.tick(TEST_TIME + 1_199_000)
  const alarm = start.storage.alarmAt
  const polls = fixture.boat.statusRequests.length
  start.restart()
  await start.tick(TEST_TIME + 1_200_000)

  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed', message: FAILURE },
  })
  expect(alarm).toBe(TEST_TIME + 1_200_000)
  expect(fixture.boat.statusRequests).toHaveLength(polls)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})

it('fails a start when its terminal password read completes at the deadline before publishing success', async () => {
  const fixture = await backendFixture()
  const start = await startRetryFixture(fixture)
  for (let step = 0; step < 3; step++) await start.advance()
  expect(await start.job()).toMatchObject({ phase: 'terminal-password' })
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    if (new URL(request.url).pathname.endsWith('/files'))
      fixture.setTime(TEST_TIME + 1_200_000)
    return response
  }
  await start.tick(TEST_TIME + 1_199_999)

  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed', message: FAILURE },
  })
  expect(await start.job()).toBeUndefined()
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})
