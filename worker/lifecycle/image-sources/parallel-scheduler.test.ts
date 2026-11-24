import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { ProviderError } from '../../sandbox/errors'
import { heldOperation } from '../../test-support/held-operation'
import { createHarness, type TestHarness } from '../../test-support/harness'
import { parallelFixture } from './parallel-test-support'
import { buildSourceJobs } from './source-data'

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

it('polls both copies and starts both imports concurrently in one run', async () => {
  const fixture = await parallelFixture(harness)
  await fixture.tick(4)
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  const polls = heldOperation()
  const starts = heldOperation()
  const commands = fixture.input.commands
  const status = commands.status.bind(commands)
  const start = commands.start.bind(commands)
  const pollCalls = vi
    .spyOn(commands, 'status')
    .mockImplementation(async (...args) => {
      await polls.wait()
      return status(...args)
    })
  const startCalls = vi
    .spyOn(commands, 'start')
    .mockImplementation(async (...args) => {
      await starts.wait()
      return start(...args)
    })
  const pending = fixture.prepare()
  try {
    await polls.entered
    expect(
      pollCalls.mock.calls.map(([command]) => command.processId).toSorted(),
    ).toEqual([2, 3])
    polls.release()
    const outcome = await Promise.race([
      starts.entered.then(() => 'starting'),
      pending.then(() => 'returned'),
    ])
    expect(outcome).toBe('starting')
    const jobs = await buildSourceJobs(fixture.env.DB, fixture.input.buildId)
    expect(jobs.map(({ phase }) => phase)).toEqual([
      'finalize-starting',
      'finalize-starting',
    ])
    expect(startCalls).toHaveBeenCalledTimes(2)
    expect(fixture.access.activeTokens).toEqual([])
  } finally {
    polls.release()
    starts.release()
    await pending
    vi.restoreAllMocks()
  }
  expect(fixture.finalizes()).toHaveLength(2)
})

it('saves every other poll result before rethrowing a transient poll error', async () => {
  const fixture = await parallelFixture(harness, { sizesKiB: [1, 1, 1] })
  await fixture.tick(4)
  fixture.copies()[1].exitCode = 0
  const failure = new ProviderError('unavailable', 503)
  fixture.statusFailures.set(fixture.copies()[0].processId, failure)
  const commands = fixture.input.commands
  const status = commands.status.bind(commands)
  vi.spyOn(commands, 'status').mockImplementation(async (...args) => ({
    ...(await status(...args)),
    stdoutNextOffset: 19,
  }))
  try {
    await expect(fixture.prepare()).rejects.toBe(failure)
    const jobs = await buildSourceJobs(fixture.env.DB, fixture.input.buildId)
    expect(
      jobs.map(({ phase, stdoutOffset }) => [phase, stdoutOffset]),
    ).toEqual([
      ['fetch', 0],
      ['finalize-ready', 0],
      ['fetch', 19],
    ])
    expect(jobs.map(({ tokenCiphertext }) => tokenCiphertext === null)).toEqual(
      [false, true, false],
    )
    expect(fixture.access.activeTokens).toHaveLength(2)
    expect(fixture.finalizes()).toHaveLength(0)
  } finally {
    vi.restoreAllMocks()
  }
})
