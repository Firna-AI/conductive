import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { startRetryFixture } from './retry-test-support'

const fixtureForTest = setupBackendTests()

it('fails a hanging detached terminal setup at the original deadline after reconstruction without reading its password', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  await start.tick(TEST_TIME + 1_197_000)
  expect(await start.job()).toMatchObject({
    phase: 'terminal',
    processId: null,
  })
  fixture.boat.commandRunning = true
  await start.tick(TEST_TIME + 1_198_000)
  const running = await start.job()
  expect(running).toMatchObject({
    phase: 'terminal',
    processId: expect.any(Number),
  })
  expect(fixture.boat.commandRequests.at(-1)).toMatchObject({
    detached: true,
    command: expect.stringContaining(
      'systemctl start conductive-terminal.service',
    ),
  })
  const commands = fixture.boat.commandRequests.length
  await start.restart()
  await start.tick(TEST_TIME + 1_199_999)
  expect(fixture.boat.statusRequests.at(-1)?.processId).toBe(running?.processId)
  expect(fixture.boat.fileReads).toEqual([])
  expect(fixture.boat.commandRequests).toHaveLength(commands)
  expect(await start.storage.getAlarm()).toBe(TEST_TIME + 1_200_000)
  const polls = fixture.boat.statusRequests.length
  await start.restart()
  await start.tick(TEST_TIME + 1_200_000)
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(fixture.boat.statusRequests).toHaveLength(polls)
  expect(fixture.boat.fileReads).toEqual([])
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
})

it('names only the exit code and time-out when detached terminal setup fails', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  await start.advance()
  expect(await start.job()).toMatchObject({ phase: 'terminal' })
  await start.advance()
  fixture.boat.commandExitCode = 1
  fixture.boat.commandOutput = 'password=private-marker'
  const job = await start.job()
  if (!job) throw new Error('Missing terminal start')
  const controls = fixture.actors.get(job.workspaceId)?.native.api.controls
  if (!controls) throw new Error('Missing native warning controls')
  await controls.captureWarnings(true)
  try {
    await start.advance()
    expect(await start.wait()).toMatchObject({
      ok: false,
      error: { code: 'workspace_start_failed' },
    })
    const warnings = await controls.warningCalls()
    expect(warnings).toContainEqual([
      expect.stringMatching(
        /^The terminal of workspace .* did not start: exit code 1, timed out false$/,
      ),
    ])
    expect(JSON.stringify(warnings)).not.toContain('private-marker')
    expect(fixture.boat.fileReads).toEqual([])
  } finally {
    await controls.captureWarnings(false)
  }
})
