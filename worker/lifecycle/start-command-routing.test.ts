import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture } from './retry-test-support'
import { pendingCreate } from './start-chain.test-support'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import { advanceToRunner } from './start-resume-test-support'
import { START_JOB_KEY } from './start-storage'

const fixtureForTest = setupBackendTests()

it('runs each create command through the provider when the host does not connect', async () => {
  const fixture = fixtureForTest()
  fixture.host.autoConnect = false
  const start = await startRetryFixture(fixture)
  await expect(start.storage.get(START_JOB_KEY)).resolves.toMatchObject({
    phase: 'startup',
    processId: 3,
    commandRoute: 'provider',
  })
  await advanceToRunner(start)

  expect(fixture.host.commandRequests).toEqual([])
  expect(fixture.host.statusRequests).toEqual([])
  expect(fixture.boat.commandRequests).toMatchObject([
    { sandboxId: 'bx_1', detached: true },
    { sandboxId: 'bx_1', detached: true },
    { sandboxId: 'bx_1', detached: true },
    { sandboxId: 'bx_1', detached: true },
  ])
  expect(fixture.boat.statusRequests.map(({ processId }) => processId)).toEqual(
    [1, 2, 3, 4],
  )
})

it('keeps a sent command off the provider path after the socket drops', async () => {
  const fixture = fixtureForTest()
  const start = await pendingCreate(fixture)
  fixture.boat.beforeCommand = () => fixture.host.disconnect('bx_1')
  await start.actor.advance(TEST_TIME + 1_000)

  expect(fixture.host.commandRequests).toMatchObject([
    { sandboxId: 'bx_1', detached: true },
  ])
  expect(fixture.boat.commandRequests).toEqual(fixture.host.commandRequests)
  expect(await start.job()).toMatchObject({
    phase: 'fetch',
    processId: null,
    providerRetry: { failures: 1, retryAt: TEST_TIME + 2_000 },
  })
})

it.each(['saved provider route', 'legacy job without a route'] as const)(
  'polls a %s on the provider after a host connects and the workspace reconstructs',
  async (savedRoute) => {
    const fixture = fixtureForTest()
    fixture.host.autoConnect = false
    const start = await startRetryFixture(fixture)
    const saved =
      await start.storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
    if (!saved) throw new Error('Missing detached start job.')
    if (savedRoute === 'legacy job without a route') {
      delete saved.commandRoute
      await start.storage.put(START_JOB_KEY, saved)
    }
    await fixture.host.connect('bx_1')
    await start.restart()
    const previousPolls = fixture.boat.statusRequests.length
    const previousCommands = fixture.boat.commandRequests.length
    await start.advance()

    expect(fixture.boat.statusRequests.slice(previousPolls)).toEqual([
      { processId: 3, stdoutOffset: 0, stderrOffset: 0 },
    ])
    expect(fixture.host.statusRequests).toEqual([])
    expect(fixture.host.commandRequests).toMatchObject([
      { sandboxId: 'bx_1', detached: true },
    ])
    expect(fixture.boat.commandRequests.slice(previousCommands)).toEqual(
      fixture.host.commandRequests,
    )
    expect(await start.job()).toMatchObject({
      phase: 'terminal',
      processId: 4,
      commandRoute: 'host',
    })
  },
)

it('retries the saved host status after reconstruction and reads it when the host reconnects', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  expect(await start.storage.get(START_JOB_KEY)).toMatchObject({
    phase: 'startup',
    processId: 3,
    commandRoute: 'host',
  })
  await start.restart()
  await fixture.host.disconnect('bx_1')
  const polls = fixture.boat.statusRequests.length
  const commands = fixture.boat.commandRequests.length
  await start.advance()

  expect(await start.job()).toMatchObject({
    phase: 'startup',
    processId: 3,
    commandRoute: 'host',
    providerRetry: { failures: 1 },
  })
  expect(fixture.boat.statusRequests).toHaveLength(polls)

  await fixture.host.connect('bx_1')
  const hostPolls = fixture.host.statusRequests.length
  await start.advance()
  expect(fixture.host.statusRequests.slice(hostPolls)).toEqual([
    { processId: 3, stdoutOffset: 0, stderrOffset: 0 },
  ])
  expect(fixture.boat.statusRequests).toHaveLength(polls + 1)
  expect(fixture.boat.commandRequests).toHaveLength(commands + 1)
  expect(fixture.host.commandRequests).toEqual(fixture.boat.commandRequests)
  expect(await start.job()).toMatchObject({
    phase: 'terminal',
    processId: 4,
    commandRoute: 'host',
    providerRetry: null,
  })
  await advanceToRunner(start)
  await start.endpoint.reportRunnerLifecycle({ type: 'runner.ready' })
  await fixture.run(() => expect(start.wait()).resolves.toEqual({ ok: true }))
})
