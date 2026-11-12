import { expect, it, vi } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { nativeWorkspaceStorage } from './platform-storage'
import { startRetryFixture } from './retry-test-support'
import { prepareStartSuccess } from './start-completion'
import { publishStartCompletion } from './start-result'
import { durableStartStorage } from './start-storage'
import type { StartCall } from './start-guard'

const fixtureForTest = setupBackendTests()

it('keeps the start job when the runner disconnects during the final user check and completes after later readiness', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const job = await start.job()
  const actor = job && fixture.actors.get(job.workspaceId)
  if (!actor) throw new Error('Missing start actor')
  const endpoint = actor.endpoint()
  for (let step = 0; step < 4; step++) await start.advance()
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  await endpoint.reportRunnerLifecycle({ type: 'runner.ready' })
  const storage = durableStartStorage(
    nativeWorkspaceStorage(start.storage),
    fixture.runtime.dependencies.now,
    fixture.runtime.env,
  )
  const disconnect: StartCall = async (call) => {
    const result = await call()
    await endpoint.runnerLifecycleDisconnected()
    return result
  }
  const waiter = { publish: vi.fn() }
  expect(
    await publishStartCompletion(
      fixture.runtime.env,
      storage,
      waiter,
      waiter,
      waiter,
      { ok: true },
      () =>
        prepareStartSuccess(
          fixture.runtime.env,
          start.endpoint,
          storage,
          fixture.runtime.dependencies.now,
          disconnect,
        ),
    ),
  ).toBe(false)
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  expect(await start.endpoint.readLifecycle()).toMatchObject({
    state: 'starting',
    runnerConnected: false,
    startupPrepared: false,
  })
  expect(waiter.publish).not.toHaveBeenCalled()
  await endpoint.reportRunnerLifecycle({ type: 'runner.ready' })
  expect(await fixture.run(() => start.wait())).toEqual({ ok: true })
  expect(await start.job()).toBeUndefined()
  expect(await start.endpoint.readLifecycle()).toMatchObject({
    state: 'ready',
    runnerConnected: true,
    startupPrepared: true,
  })
})
