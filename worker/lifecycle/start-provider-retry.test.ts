import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture, statusFault } from './retry-test-support'

const backendFixture = setupBackendTests()

it('bounds lasting start status faults across alarm restarts and retains existing failure cleanup', async () => {
  const fixture = await backendFixture()
  const start = await startRetryFixture(fixture)
  statusFault(fixture)
  const now = fixture.runtime.dependencies.now() + 1_000
  await start.tick(now)
  await start.restart()
  await start.tick(now + 1_000)
  const calls = fixture.boat.statusRequests.length
  await start.tick(now + 2_000)
  const earlyCalls = fixture.boat.statusRequests.length
  await start.tick(now + 3_000)
  await start.tick(now + 600_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message: 'The cloud computer could not start. Try again.',
    },
  })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(earlyCalls).toBe(calls)
  expect(
    fixture.boat.deadlineIds.filter((id) => id === 'bx_1').length,
  ).toBeGreaterThan(4)
})

it('preserves captured start output and lets cancellation bypass a pending retry', async () => {
  const fixture = await backendFixture()
  const start = await startRetryFixture(fixture)
  const fault = statusFault(fixture)
  const now = fixture.runtime.dependencies.now() + 1_000
  await start.tick(now)
  fault.recover()
  fixture.boat.commandOutput = 'captured output\n'
  await start.tick(now + 1_000)
  expect((await start.endpoint.readLifecycleStartLog()).text).toContain(
    'captured output\n',
  )
  await start.tick(now + 2_000)
  fault.fail('60')
  await start.tick(now + 3_000)
  expect(await start.storage.getAlarm()).toBe(now + 63_000)
  expect(await start.job()).toMatchObject({
    phase: 'terminal',
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  await start.endpoint.lifecycleStopped()
  expect(await start.storage.getAlarm()).toBe(now + 4_000)
  await start.tick(now + 4_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_stopped' },
  })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})
