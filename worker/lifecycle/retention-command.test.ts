import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { heldOperation } from './platform-test-storage'
import { retentionCommandFixture } from './retention-command-test-support'
import { resumeWorkspace } from './workspace-resume'

const backendFixture = setupBackendTests()
const DEADLINE = TEST_TIME + 1_124_460_000
const FAILURE =
  'The cloud computer did not start within the 20-minute limit. Try again.'

it('polls a retained never-ending maintenance script across reconstruction and stops it at the original deadline', async () => {
  const fixture = await retentionCommandFixture(await backendFixture())
  const { boat, platform } = fixture
  const held = heldOperation()
  boat.commandRunning = true
  boat.commandOutput = 'maintenance still running\n'
  boat.beforeCommand = async (command, detached) => {
    if (command.includes('/run/conductive/retention-startup.sh') && !detached)
      await held.wait()
  }
  const commands = boat.commandRequests.length
  const advancing = platform.endpoint().alarm()
  try {
    const result = await Promise.race([
      advancing.then(() => 'advanced'),
      held.entered.then(() => 'blocked'),
    ])
    expect(result).toBe('advanced')
  } finally {
    held.release()
    await advancing
  }
  expect(await fixture.progress()).toEqual({ phase: 'startup', error: null })
  expect(boat.commandRequests.slice(commands)).toEqual([
    expect.objectContaining({ detached: true }),
  ])
  platform.restart()
  await fixture.tick(DEADLINE - 1)
  expect(await fixture.progress()).toEqual({ phase: 'startup', error: null })
  expect(platform.storage.alarmAt).toBe(DEADLINE)
  expect(boat.commandRequests).toHaveLength(commands + 1)
  expect(boat.statusRequests.at(-1)).toEqual({
    processId: 4,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  boat.failStop = true
  platform.restart()
  await fixture.tick(DEADLINE)
  expect(await fixture.progress()).toEqual({ phase: 'stop', error: FAILURE })
  expect(boat.stopIds).toEqual(['bx_1'])
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    error: { message: FAILURE },
  })
  boat.failStop = false
  boat.commandRunning = false
  platform.restart()
  await fixture.tick(DEADLINE + 5_000)
  expect(await fixture.progress()).toBeNull()
  expect(boat.stopIds).toEqual(['bx_1', 'bx_1'])
  await fixture.run(() =>
    resumeWorkspace(
      fixture.runtime,
      fixture.org.id,
      fixture.id,
      fixture.user.id,
    ),
  )
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    startupPrepared: true,
    error: null,
  })
  expect(boat.resumeIds).toEqual(['bx_1', 'bx_1'])
})

it('hands an active maintenance script to confirmed stop cleanup before accepting a user resume', async () => {
  const fixture = await retentionCommandFixture(await backendFixture())
  const { boat, platform, runtime, org, user, id } = fixture
  boat.commandRunning = true
  await platform.endpoint().alarm()
  expect(await fixture.progress()).toEqual({ phase: 'startup', error: null })
  const commands = boat.commandRequests.length
  boat.commandRunning = false
  await fixture.run(() => resumeWorkspace(runtime, org.id, id, user.id))
  expect(await fixture.progress()).toBeNull()
  expect(boat.stopIds).toEqual(['bx_1'])
  expect(boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  expect(
    boat.commandRequests
      .slice(commands)
      .filter((request) =>
        request.command.includes('/run/conductive/retention-startup.sh'),
      ),
  ).toEqual([])
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    startupPrepared: true,
    error: null,
  })
})
