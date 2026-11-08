import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { runningRuntimeWorkspace } from './runtime-lifecycle-test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  await fixture.dispose()
})

it.each([
  { native: 'archived', refused: false, expected: 'stopped', reads: 0 },
  { native: 'archived', refused: true, expected: 'stopped', reads: 1 },
  { native: 'error', refused: false, expected: 'error', reads: 0 },
  { native: 'error', refused: true, expected: 'error', reads: 1 },
] as const)(
  'reconciles $native after an actual runtime restart when deadline refusal is $refused',
  async ({ native, refused, expected, reads }) => {
    const { actor, workspaceId, sandboxId } =
      await runningRuntimeWorkspace(fixture)
    expect(await actor.readLifecycle()).toMatchObject({
      state: 'working',
      runnerConnected: true,
      runningSessions: ['session-one', 'session-two'],
    })
    await fixture.restart(false)
    fixture.boat.states.set(sandboxId, native)
    fixture.boat.failDeadline = refused
    const readCount = fixture.boat.sandboxReads.length
    const deadlineCount = fixture.boat.deadlineIds.length
    const restored = fixture.actor(workspaceId)
    await restored.tick()
    expect(await restored.readLifecycle()).toMatchObject({
      state: expected,
      runnerConnected: false,
      runningSessions: [],
    })
    expect(await restored.credentialSender('turn-one')).toBeNull()
    expect(await restored.credentialSender('turn-two')).toBeNull()
    expect(fixture.boat.sandboxReads.slice(readCount)).toEqual(
      reads === 0 ? [] : [sandboxId],
    )
    expect(fixture.boat.deadlineIds.slice(deadlineCount)).toEqual([sandboxId])
    expect(fixture.boat.stopIds).toEqual([])
    expect(fixture.boat.resumeIds).toEqual([])
    expect(fixture.boat.deletedIds).toEqual([])
  },
)

it('keeps a running sandbox active after input and a refused deadline update', async () => {
  const { actor, workspaceId, sandboxId, startTurn, finishTurn } =
    await runningRuntimeWorkspace(fixture)
  await finishTurn('one')
  await finishTurn('two')
  await actor.lifecycleActivity()
  expect(await actor.readLifecycle()).toMatchObject({
    state: 'ready',
    runningSessions: [],
    runnerConnected: true,
  })
  await startTurn('three')
  await fixture.restart(false)
  fixture.boat.failDeadline = true
  const readCount = fixture.boat.sandboxReads.length
  const restored = fixture.actor(workspaceId)
  await restored.tick()
  expect(await restored.readLifecycle()).toMatchObject({
    state: 'working',
    runningSessions: ['session-three'],
    runnerConnected: true,
  })
  expect(fixture.boat.sandboxReads.slice(readCount)).toEqual([sandboxId])
  expect(fixture.boat.stopIds).toEqual([])
  expect(fixture.boat.resumeIds).toEqual([])
  expect(fixture.boat.deletedIds).toEqual([])
})
