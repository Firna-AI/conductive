import { expect, it } from 'vitest'

import { privilegedCommand, shellArgument } from '../terminal/privileged'
import { TERMINAL_RESTORE_MARKER } from '../terminal/scripts'
import { setupBackendTests } from './backend-test-hooks'
import type { backendFixture } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { resumeCompletedWorkspace } from './completed-resume-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { DISK_KEEPALIVE_MS } from './durable-types'
import { stopWorkspaceSandbox } from './workspace-actions'
import { suspendOrg } from '../operator/suspend-org'

const fixtureForTest = setupBackendTests()
type Fixture = Awaited<ReturnType<typeof backendFixture>>

async function startWorkspace(fixture: Fixture) {
  const { runtime, org, user } = fixture
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('Missing workspace controller')
  return { actor, id, startedAt: runtime.dependencies.now() }
}

function markerCommands(fixture: Fixture) {
  return fixture.boat.commandRequests.filter(({ command }) =>
    command.includes(TERMINAL_RESTORE_MARKER),
  )
}

it('writes the restore marker once after hydration and keeps the watch across a workspace restart', async () => {
  const fixture = fixtureForTest()
  fixture.boat.hydrated = false
  const { actor, id, startedAt } = await startWorkspace(fixture)
  const reads = fixture.boat.sandboxReads.length
  await fixture.advanceTo(startedAt + 4_999, id)
  expect(fixture.boat.sandboxReads.slice(reads)).toEqual([])
  await fixture.advanceTo(startedAt + 5_000, id)
  expect(fixture.boat.sandboxReads.slice(reads)).toEqual(['bx_1'])
  expect(markerCommands(fixture)).toEqual([])
  expect(actor.storage.alarmAt).toBe(startedAt + 10_000)
  actor.restart()
  fixture.boat.hydrated = true
  await fixture.advanceTo(startedAt + 10_000, id)
  expect(markerCommands(fixture)).toEqual([
    {
      sandboxId: 'bx_1',
      command: privilegedCommand(
        `touch ${shellArgument(TERMINAL_RESTORE_MARKER)}`,
      ),
      detached: false,
    },
  ])
  await fixture.advanceTo(startedAt + 15_000, id)
  expect(fixture.boat.sandboxReads.slice(reads)).toEqual(['bx_1', 'bx_1'])
  expect(markerCommands(fixture)).toHaveLength(1)
})

it('writes the restore marker when hydrated is absent after create and resume', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user } = fixture
  const { actor, id, startedAt } = await startWorkspace(fixture)
  await fixture.advanceTo(startedAt + 5_000, id)
  expect(markerCommands(fixture)).toHaveLength(1)
  await stopWorkspaceSandbox({
    env: runtime.env,
    dependencies: runtime.dependencies,
    orgId: org.id,
    workspaceId: id,
  })
  await actor.endpoint().lifecycleStopped()
  await fixture.run(() =>
    resumeCompletedWorkspace(runtime, org.id, id, user.id),
  )
  const resumedAt = runtime.dependencies.now()
  expect(markerCommands(fixture)).toHaveLength(1)
  await fixture.advanceTo(resumedAt + 5_000, id)
  expect(markerCommands(fixture)).toHaveLength(2)
  const reads = fixture.boat.sandboxReads.length
  await fixture.advanceTo(resumedAt + 10_000, id)
  expect(fixture.boat.sandboxReads).toHaveLength(reads)
  expect(markerCommands(fixture)).toHaveLength(2)
})

it('ends the restore watch at stop and does not restart it for disk retention', async () => {
  const fixture = fixtureForTest()
  const { runtime, org } = fixture
  fixture.boat.hydrated = false
  const { actor, id, startedAt } = await startWorkspace(fixture)
  const reads = fixture.boat.sandboxReads.length
  await fixture.advanceTo(startedAt + 5_000, id)
  expect(fixture.boat.sandboxReads.slice(reads)).toEqual(['bx_1'])
  await stopWorkspaceSandbox({
    env: runtime.env,
    dependencies: runtime.dependencies,
    orgId: org.id,
    workspaceId: id,
  })
  await actor.endpoint().lifecycleStopped()
  fixture.boat.hydrated = true
  const stoppedReads = fixture.boat.sandboxReads.length
  await fixture.advanceTo(startedAt + 10_000, id)
  expect(fixture.boat.sandboxReads).toHaveLength(stoppedReads)
  fixture.setTime(runtime.dependencies.now() + DISK_KEEPALIVE_MS)
  for (let step = 0; step < 5; step++) await actor.endpoint().alarm()
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  expect((await actor.endpoint().readLifecycle())?.state).toBe('stopped')
  const retainedReads = fixture.boat.sandboxReads.length
  await fixture.advanceTo(runtime.dependencies.now() + 5_000, id)
  expect(fixture.boat.sandboxReads).toHaveLength(retainedReads)
  expect(markerCommands(fixture)).toEqual([])
})

it.each([
  { native: 'archiving', expected: 'ready' },
  { native: 'archived', expected: 'stopped' },
  { native: 'error', expected: 'error' },
] as const)(
  'ends the restore watch without a marker when Boat reports $native',
  async ({ native, expected }) => {
    const fixture = fixtureForTest()
    fixture.boat.hydrated = false
    const { actor, id, startedAt } = await startWorkspace(fixture)
    fixture.boat.states.set('bx_1', native)
    fixture.boat.hydrated = true
    await fixture.advanceTo(startedAt + 5_000, id)
    expect((await actor.endpoint().readLifecycle())?.state).toBe(expected)
    expect(markerCommands(fixture)).toEqual([])
    fixture.boat.states.set('bx_1', 'ready')
    await fixture.advanceTo(startedAt + 10_000, id)
    expect(markerCommands(fixture)).toEqual([])
  },
)

it.each(['start', 'error', 'archive'] as const)(
  'ends an unfinished restore watch at a new workspace %s',
  async (event) => {
    const fixture = fixtureForTest()
    fixture.boat.hydrated = false
    const { actor, id, startedAt } = await startWorkspace(fixture)
    const reads = fixture.boat.sandboxReads.length
    await fixture.advanceTo(startedAt + 5_000, id)
    expect(fixture.boat.sandboxReads.slice(reads)).toEqual(['bx_1'])
    if (event === 'start') await actor.endpoint().beginLifecycleStart('resume')
    else if (event === 'error')
      await actor.endpoint().lifecycleFailed({
        code: 'sandbox_failed',
        message: 'The cloud computer stopped with an error. Try again.',
        log: null,
      })
    else await actor.endpoint().clearLifecycle()
    fixture.boat.hydrated = true
    await fixture.advanceTo(startedAt + 10_000, id)
    expect(markerCommands(fixture)).toEqual([])
  },
)

it('ends the restore watch when an org suspension leaves its stop pending', async () => {
  const fixture = fixtureForTest()
  fixture.boat.hydrated = false
  fixture.boat.stopReplyState = 'running'
  const { actor, id, startedAt } = await startWorkspace(fixture)
  expect(await actor.endpoint().readLifecycle()).toMatchObject({
    restoreWatchAt: startedAt + 5_000,
  })
  expect(
    await suspendOrg(fixture.runtime, fixture.org.id, fixture.user.id),
  ).toMatchObject({ pendingWorkspaceIds: [id] })
  expect(
    (await actor.endpoint().readLifecycle())?.restoreWatchAt,
  ).toBeUndefined()
  fixture.boat.hydrated = true
  await fixture.advanceTo(startedAt + 35_000, id)
  expect(markerCommands(fixture)).toEqual([])
})

it('keeps the restore watch after Boat read and marker command errors', async () => {
  const fixture = fixtureForTest()
  fixture.boat.hydrated = false
  const { actor, id, startedAt } = await startWorkspace(fixture)
  fixture.boat.beforeSandboxRead = async () => {
    throw new Error('Boat read failed')
  }
  await fixture.advanceTo(startedAt + 5_000, id)
  expect(actor.storage.alarmAt).toBe(startedAt + 35_000)
  expect(markerCommands(fixture)).toEqual([])
  fixture.boat.beforeSandboxRead = undefined
  await fixture.advanceTo(startedAt + 35_000, id)
  expect(actor.storage.alarmAt).toBe(startedAt + 40_000)
  fixture.boat.hydrated = true
  fixture.boat.synchronousExitCode = 1
  await fixture.advanceTo(startedAt + 40_000, id)
  expect(actor.storage.alarmAt).toBe(startedAt + 70_000)
  expect(markerCommands(fixture)).toHaveLength(1)
  fixture.boat.synchronousExitCode = 0
  await fixture.advanceTo(startedAt + 70_000, id)
  expect(markerCommands(fixture)).toHaveLength(2)
  const reads = fixture.boat.sandboxReads.length
  await fixture.advanceTo(startedAt + 75_000, id)
  expect(fixture.boat.sandboxReads).toHaveLength(reads)
  expect(markerCommands(fixture)).toHaveLength(2)
})
