import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { recordUserSuspension } from '../operator/data'
import { archiveActions } from './archive-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { lifecycleCommandBody } from './command-test-support'
import { pendingCreate } from './start-chain.test-support'
import { outsideResumeJob } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()

it('keeps admission separate and chains create exits with the same step order, times, and credential scope', async () => {
  const fixture = fixtureForTest()
  const start = await pendingCreate(fixture)
  expect(await start.job()).toMatchObject({ phase: 'machine' })
  expect(fixture.boat.starts).toEqual([])
  const credentials: (string | null)[] = []
  fixture.boat.beforeCommand = async () => {
    credentials.push(
      await start.endpoint.credentialSender((await start.stored()).turnId),
    )
  }
  await start.actor.advance(TEST_TIME + 1_000)
  expect(await start.job()).toMatchObject({ phase: 'fetch', processId: 1 })
  await start.actor.advance(TEST_TIME + 2_000)
  expect(await start.job()).toMatchObject({ phase: 'branch', processId: 2 })
  expect(lifecycleCommandBody(fixture.boat.commands.at(-1) ?? '')).toContain(
    'git checkout -b',
  )
  await start.actor.advance(TEST_TIME + 3_000)
  expect(await start.job()).toMatchObject({ phase: 'startup', processId: 3 })
  await start.actor.advance(TEST_TIME + 4_000)
  expect(await start.job()).toMatchObject({ phase: 'terminal', processId: 4 })
  await start.actor.advance(TEST_TIME + 5_000)
  expect(await start.job()).toMatchObject({ phase: 'runner' })
  expect(credentials).toEqual([fixture.user.id, fixture.user.id, null, null])
  expect(fixture.boat.fileReads).toHaveLength(2)
  const steps = (await start.endpoint.readLifecycle())?.start?.steps
  expect(
    steps?.map(({ id, state, startedAt, completedAt }) => ({
      id,
      state,
      startedAt,
      completedAt,
    })),
  ).toEqual([
    {
      id: 'image',
      state: 'completed',
      startedAt: TEST_TIME + 1_000,
      completedAt: TEST_TIME + 1_000,
    },
    {
      id: 'fetch',
      state: 'completed',
      startedAt: TEST_TIME + 1_000,
      completedAt: TEST_TIME + 2_000,
    },
    {
      id: 'branch',
      state: 'completed',
      startedAt: TEST_TIME + 2_000,
      completedAt: TEST_TIME + 3_000,
    },
    {
      id: 'startup',
      state: 'completed',
      startedAt: TEST_TIME + 3_000,
      completedAt: TEST_TIME + 5_000,
    },
    {
      id: 'runner',
      state: 'running',
      startedAt: TEST_TIME + 5_000,
      completedAt: null,
    },
  ])
  await start.actor.restart()
  await start.endpoint.reportRunnerLifecycle({ type: 'runner.ready' })
  await start.advance()
  expect(await start.wait()).toEqual({ ok: true })
})

it('checks access again after a completed fetch before it starts the branch command', async () => {
  const fixture = fixtureForTest()
  const start = await pendingCreate(fixture)
  await start.advance()
  start.actor.observePublication(async ({ event }) => {
    if (
      event.type === 'start.updated' &&
      event.start.steps.some(
        (step) => step.id === 'fetch' && step.state === 'completed',
      )
    )
      await recordUserSuspension(
        fixture.runtime.env.DB,
        fixture.user.githubId,
        fixture.user.id,
        fixture.runtime.dependencies.now(),
      )
  })
  await start.advance()
  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'user_suspended' },
  })
  expect(fixture.boat.commandRequests).toHaveLength(1)
})

it('starts a resumed startup in the run that sees readiness and stops after a backward move', async () => {
  const fixture = fixtureForTest()
  const { actor, id, sandboxId } = await seededCompletedWorkspace(fixture)
  await actor.endpoint().lifecycleStopped()
  fixture.boat.states.set(sandboxId, 'archived')
  const resume = outsideResumeJob(fixture, id, sandboxId)
  expect(await actor.endpoint().queueLifecycleStart(resume)).toBe(true)
  let reads = 0
  fixture.boat.beforeSandboxRead = async () => {
    if (++reads === 2) fixture.boat.states.set(sandboxId, 'archived')
  }
  await actor.advance(TEST_TIME + 1_000)
  expect(await fixture.starts.get(id)?.job()).toMatchObject({
    phase: 'machine',
  })
  expect(fixture.boat.resumeIds).toEqual([sandboxId])
  expect(fixture.boat.commandRequests).toEqual([])
  fixture.boat.beforeSandboxRead = undefined
  await actor.advance(TEST_TIME + 2_000)
  expect(await fixture.starts.get(id)?.job()).toMatchObject({
    phase: 'startup',
    processId: 1,
  })
  expect(fixture.boat.resumeIds).toEqual([sandboxId, sandboxId])
})

it('does not start the next command when an exit reaches the five-second run limit', async () => {
  const fixture = fixtureForTest()
  const start = await pendingCreate(fixture)
  const admitted = await start.stored()
  await start.save({ ...admitted, deadlineAt: undefined })
  await start.actor.restart()
  await start.actor.advance(TEST_TIME + 1_000)
  fixture.boat.beforeStatus = async () => {
    await fixture.setTime(TEST_TIME + 7_000)
  }
  await start.actor.advance(TEST_TIME + 2_000)
  expect(await start.job()).toMatchObject({ phase: 'branch', processId: null })
  expect(fixture.boat.commandRequests).toHaveLength(1)
  expect(await start.actor.storage.get('alarm:lifecycle:start')).toBe(
    TEST_TIME + 8_000,
  )
  fixture.boat.beforeStatus = undefined
  await start.advance()
  expect(await start.job()).toMatchObject({ phase: 'branch', processId: 2 })
})

it.each(['stop', 'archive'] as const)(
  'ends chained progress after a %s while the next command starts',
  async (action) => {
    const fixture = fixtureForTest()
    const start = await pendingCreate(fixture)
    await start.advance()
    fixture.boat.beforeCommand = async () => {
      fixture.boat.beforeCommand = undefined
      if (action === 'stop') await start.endpoint.lifecycleStopped()
      else
        await archiveActions(
          fixture,
          (await start.stored()).workspaceId,
          start.actor,
        ).archive()
    }
    await start.advance()
    const commands = fixture.boat.commandRequests.length
    await start.advance()
    expect(await start.job()).toBeUndefined()
    expect(await start.wait()).toMatchObject({
      ok: false,
      error: { code: 'workspace_start_stopped' },
    })
    expect(fixture.boat.commandRequests).toHaveLength(commands)
    expect(fixture.boat.fileReads).toEqual([])
  },
)
