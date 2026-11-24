import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  boatAccountHeaders,
  boatCommandRequests,
} from './boat-command-requests.test-support'
import { storedAccountFixture } from './continue-accounts.test-support'

const HOST_WAIT_MS = 120_000

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it.each([
  {
    phase: 'fetch',
    exitCode: 0,
    result: { state: 'continued' },
    statusAccounts: ['kept-org', 'kept-org'],
  },
  {
    phase: 'move',
    exitCode: 80,
    result: { status: 409, code: 'workspace_continue_failed' },
    statusAccounts: ['kept-org'],
  },
] as const)(
  'recovers the saved $phase journal through the stored account after the host stays away',
  async ({ phase, exitCode, result, statusAccounts }) => {
    const f = await storedAccountFixture(harness)
    let now = TEST_TIME
    f.options.dependencies.now = () => now
    const pending = await f.start()
    if (pending.state !== 'pending')
      throw new Error('Expected pending Continue.')
    await f.advanceTo(phase)
    f.boat.commandRunning = true
    await f.coordinator.advance()
    const started = await f.active()
    const command = f.host.commandRequests.at(-1)?.command
    if (!started || started.processId === null || command === undefined)
      throw new Error('Expected a detached host command.')
    expect(started).toMatchObject({ phase, commandRoute: 'host' })
    const requests = () =>
      boatCommandRequests(f.boat.server.requests, 'bx_continue')
    const commands = f.boat.commandRequests.length
    const polls = f.boat.statusRequests.length

    await f.host.disconnect('bx_continue')
    await f.coordinator.advance()
    f.reconstruct()
    now += HOST_WAIT_MS - 1
    await f.coordinator.advance()
    expect(await f.active()).toMatchObject({
      phase,
      commandRoute: 'host',
      processId: started.processId,
    })
    expect(f.boat.commandRequests).toHaveLength(commands)
    expect(requests()).toEqual({ commands: [], statuses: [] })

    now++
    await f.coordinator.advance()
    const cleared = await f.active()
    expect(cleared).toMatchObject({
      phase,
      commandStarted: true,
      processId: null,
    })
    expect(cleared).not.toHaveProperty('commandRoute')
    expect(f.boat.commandRequests.slice(commands)).toEqual(
      phase === 'move'
        ? [
            expect.objectContaining({
              detached: false,
              command: expect.stringContaining('symbolic-ref --short HEAD'),
            }),
          ]
        : [],
    )
    const inspections = requests().commands.length
    await f.coordinator.advance()
    const recovered = await f.active()
    expect(recovered).toMatchObject({ phase, commandRoute: 'provider' })
    expect(recovered?.processId).not.toBe(started.processId)
    expect(boatAccountHeaders(requests().commands.slice(inspections))).toEqual([
      'kept-org',
    ])
    const reattach = f.boat.commandRequests.at(-1)
    expect(reattach).toMatchObject({
      detached: true,
      command: expect.stringMatching(/^test -L .*\/owner' \|\| exit 125\n/),
    })
    expect(reattach?.command.split('\n').slice(1).join('\n')).toBe(command)

    f.boat.commandRunning = false
    f.boat.commandExitCode = exitCode
    await f.finish()
    expect(await f.active()).toBeNull()
    expect(
      await f.result(pending.continueId).catch((error: unknown) => error),
    ).toMatchObject(result)
    expect(boatAccountHeaders(requests().statuses)).toEqual(statusAccounts)
    const polled = f.boat.statusRequests
      .slice(polls)
      .map(({ processId }) => processId)
    expect(polled[0]).toBe(recovered?.processId)
    expect(polled).not.toContain(started.processId)
  },
)

it('clears the failure time and reads the same process when the host returns within the wait', async () => {
  const f = await storedAccountFixture(harness)
  let now = TEST_TIME
  f.options.dependencies.now = () => now
  await f.start()
  await f.advanceTo('fetch')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  const started = await f.active()
  expect(started).toMatchObject({ commandRoute: 'host', processId: 1 })
  const commands = f.boat.commandRequests.length

  await f.host.disconnect('bx_continue')
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ hostStatusFailingSince: TEST_TIME })
  now += HOST_WAIT_MS - 1
  await f.host.connect('bx_continue')
  await f.coordinator.advance()

  expect(f.host.statusRequests).toEqual([
    { processId: 1, stdoutOffset: 0, stderrOffset: 0 },
  ])
  const resumed = await f.active()
  expect(resumed).toMatchObject({
    phase: 'fetch',
    commandRoute: 'host',
    processId: 1,
  })
  expect(resumed).not.toHaveProperty('hostStatusFailingSince')
  expect(f.boat.commandRequests).toHaveLength(commands)
  expect(boatCommandRequests(f.boat.server.requests, 'bx_continue')).toEqual({
    commands: [],
    statuses: [],
  })
})
