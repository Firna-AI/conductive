import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
} from './durable-types'
import { retentionCommandFixture } from './retention-command-test-support'
import { readWorkspaceImageRecords } from './workspace-software-data'
import { workspaceResponse } from './workspace-response'
import { currentSoftwareVersion } from './workspace-software-start.test-support'
import { resumeCompletedWorkspace } from './completed-resume-test-support'

const fixtureForTest = setupBackendTests()
const deadline = TEST_TIME + 1_124_460_000

it('updates an old stopped workspace before its retention startup and retains update checkpoints across reconstruction', async () => {
  const fixture = await retentionCommandFixture(fixtureForTest(), {
    version: 'old-software',
    updateFailed: true,
  })
  const { platform, boat, runtime, org, id } = fixture
  expect(await fixture.progress()).toEqual({ phase: 'software', error: null })
  expect(await workspaceResponse(runtime, org.id, id)).toMatchObject({
    workspace: { softwareUpdateFailed: false },
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({
          id: 'software',
          label: 'Updating the agent and terminal software',
          state: 'running',
        }),
      ]),
    },
  })
  const commands = boat.commandRequests.length
  await platform.endpoint().advance()
  boat.commandOutput = 'upgrade output\n'
  boat.statusChunkSize = 3
  await platform.endpoint().advance()
  const state =
    await platform.storage.get<DurableLifecycleState>(LIFECYCLE_STATE_KEY)
  expect(state?.diskRetentionCommand).toMatchObject({
    processId: expect.any(Number),
    stdoutOffset: 3,
  })
  await platform.restart()
  await platform.endpoint().advance()
  expect(boat.commandRequests.slice(commands)).toHaveLength(1)
  expect(boat.statusRequests.at(-1)).toMatchObject({
    processId: state?.diskRetentionCommand?.processId,
    stdoutOffset: 3,
  })
  boat.statusChunkSize = Infinity
  await platform.endpoint().advance()
  expect(await fixture.progress()).toEqual({ phase: 'startup', error: null })
  expect(await workspaceResponse(runtime, org.id, id)).toMatchObject({
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({
          id: 'software',
          label: 'Updating the agent and terminal software',
          state: 'completed',
        }),
      ]),
    },
  })
  expect(
    await readWorkspaceImageRecords(runtime.env.DB, org.id, id),
  ).toMatchObject({
    softwareVersion: await currentSoftwareVersion(),
    softwareUpdateFailed: false,
  })
  await platform.restart()
  await platform.endpoint().advance()
  expect(
    boat.commandRequests
      .slice(commands)
      .map(({ command }) => [
        command.includes(SOFTWARE.url),
        command.includes('/run/conductive/retention-startup.sh'),
      ]),
  ).toEqual([
    [true, false],
    [false, true],
  ])
  await platform.endpoint().advance()
  await platform.endpoint().advance()
  expect(await fixture.progress()).toBeNull()
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    runnerConnected: false,
    error: null,
  })
  expect(
    boat.commands
      .slice(commands)
      .some((command) =>
        command.includes('systemctl restart conductive-runner.service'),
      ),
  ).toBe(false)
})

it('continues retention after a failed update and retries it at the next retention start', async () => {
  const fixture = await retentionCommandFixture(fixtureForTest(), {
    version: 'old-software',
  })
  const { platform, boat, runtime, org, id } = fixture
  expect(await fixture.progress()).toEqual({ phase: 'software', error: null })
  const commands = boat.commandRequests.length
  await platform.endpoint().advance()
  boat.commandExitCode = 1
  await platform.endpoint().advance()
  boat.commandExitCode = 0
  for (let step = 0; step < 3; step++) await platform.endpoint().advance()
  await platform.restart()
  expect(await fixture.progress()).toBeNull()
  expect(
    await readWorkspaceImageRecords(runtime.env.DB, org.id, id),
  ).toMatchObject({
    softwareVersion: 'old-software',
    softwareUpdateFailed: true,
  })
  expect(await workspaceResponse(runtime, org.id, id)).toMatchObject({
    workspace: { state: 'stopped', softwareUpdateFailed: true },
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({
          id: 'software',
          label: 'Updating the agent and terminal software',
          state: 'failed',
        }),
      ]),
    },
  })
  const next = (await platform.endpoint().readLifecycle())?.nextDiskKeepaliveAt
  if (next === undefined || next === null)
    throw new Error('Missing next retention start')
  await fixture.tick(next)
  expect(await workspaceResponse(runtime, org.id, id)).toMatchObject({
    workspace: { softwareUpdateFailed: false },
  })
  await platform.endpoint().advance()
  expect(await fixture.progress()).toEqual({ phase: 'software', error: null })
  for (let step = 0; step < 5; step++) await platform.endpoint().advance()
  expect(await fixture.progress()).toBeNull()
  expect(
    await readWorkspaceImageRecords(runtime.env.DB, org.id, id),
  ).toMatchObject({
    softwareVersion: await currentSoftwareVersion(),
    softwareUpdateFailed: false,
  })
  expect(
    boat.commandRequests
      .slice(commands)
      .filter(({ command }) => command.includes(SOFTWARE.url)),
  ).toHaveLength(2)
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    error: null,
  })
})

it('stops a hung retention software update at the original start deadline without running the startup script', async () => {
  const fixture = await retentionCommandFixture(fixtureForTest(), {
    version: 'old-software',
  })
  const { platform, boat, runtime, org, id } = fixture
  expect(await fixture.progress()).toEqual({ phase: 'software', error: null })
  const commands = boat.commandRequests.length
  await platform.endpoint().advance()
  boat.commandRunning = true
  await platform.restart()
  await fixture.tick(deadline - 1)
  expect(await fixture.progress()).toEqual({ phase: 'software', error: null })
  expect(await platform.storage.getAlarm()).toBe(deadline)
  await fixture.tick(deadline)
  expect(await fixture.progress()).toBeNull()
  expect(await platform.endpoint().readLifecycle()).toMatchObject({
    state: 'stopped',
    start: {
      steps: expect.arrayContaining([
        expect.objectContaining({
          id: 'software',
          label: 'Updating the agent and terminal software',
          state: 'failed',
        }),
      ]),
    },
    error: {
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(boat.stopIds).toEqual(['bx_1'])
  expect(
    boat.commandRequests
      .slice(commands)
      .map(({ command }) =>
        command.includes('/run/conductive/retention-startup.sh'),
      ),
  ).toEqual([false])
  expect(
    await readWorkspaceImageRecords(runtime.env.DB, org.id, id),
  ).toMatchObject({ softwareVersion: 'old-software' })
})

it('hands a running retention software update to confirmed stop cleanup before a user resume', async () => {
  const fixture = await retentionCommandFixture(fixtureForTest(), {
    version: 'old-software',
  })
  const { platform, boat, runtime, org, user, id } = fixture
  boat.commandRunning = true
  await platform.endpoint().advance()
  expect(await fixture.progress()).toEqual({ phase: 'software', error: null })
  const commands = boat.commandRequests.length
  boat.commandRunning = false
  await expect(
    fixture.run(() => resumeCompletedWorkspace(runtime, org.id, id, user.id)),
  ).resolves.toMatchObject({ workspace: { state: 'ready' } })
  expect(await fixture.progress()).toBeNull()
  expect(boat.stopIds).toEqual(['bx_1'])
  expect(boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  expect(
    boat.commandRequests
      .slice(commands)
      .filter(({ command }) =>
        command.includes('/run/conductive/retention-startup.sh'),
      ),
  ).toEqual([])
})
