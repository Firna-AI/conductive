import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { runningRuntimeWorkspace } from './runtime-lifecycle-test-support'
import { publicHistory } from './runtime-events-test-support'
import { record } from '../chat/inputs'

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

const continuations = ['one', 'two'].map((suffix) => ({
  type: 'turn.continued',
  sessionId: `session-${suffix}`,
  previousTurnId: `turn-${suffix}`,
  turnId: expect.any(String),
  next: 'turn',
}))

it.each([
  {
    native: 'archived',
    refused: false,
    expected: 'starting',
    reads: 1,
    startKind: 'resume',
    continued: continuations,
  },
  {
    native: 'archived',
    refused: true,
    expected: 'starting',
    reads: 2,
    startKind: 'resume',
    continued: continuations,
  },
  {
    native: 'error',
    refused: false,
    expected: 'error',
    reads: 0,
    startKind: undefined,
    continued: [],
  },
  {
    native: 'error',
    refused: true,
    expected: 'error',
    reads: 1,
    startKind: undefined,
    continued: [],
  },
] as const)(
  'reconciles $native and queues only provider-stop continuations after a runtime restart when deadline refusal is $refused',
  async ({ native, refused, expected, reads, startKind, continued }) => {
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
      Array.from({ length: reads }, () => sandboxId),
    )
    expect(fixture.boat.deadlineIds.slice(deadlineCount)).toEqual([sandboxId])
    expect(fixture.boat.stopIds).toEqual([])
    expect(fixture.boat.resumeIds).toEqual(
      startKind === 'resume' ? [sandboxId] : [],
    )
    expect(fixture.boat.deletedIds).toEqual([])
    const start = await restored.checkpoint()
    expect(
      start && {
        kind: start.kind,
        requestedByUserId: start.requestedByUserId,
        allocatedSandboxId: start.allocatedSandboxId,
      },
    ).toEqual(
      startKind === 'resume'
        ? {
            kind: 'resume',
            requestedByUserId: 'runtime-user',
            allocatedSandboxId: sandboxId,
          }
        : undefined,
    )
    const browser = await fixture.openEvents(workspaceId)
    const history = await publicHistory(browser.inbox)
    const events = history.events.map((envelope) => record(envelope.event))
    expect(events.filter((event) => event.type === 'turn.continued')).toEqual(
      continued,
    )
    expect(
      events
        .filter((event) => event.type === 'turn.completed')
        .map((event) => ({
          sessionId: event.sessionId,
          turnId: event.turnId,
          state: event.state,
          endReason: event.endReason,
        })),
    ).toEqual(
      ['one', 'two'].map((suffix) => ({
        sessionId: `session-${suffix}`,
        turnId: `turn-${suffix}`,
        state: 'stopped',
        endReason: native === 'archived' ? 'cloud_computer_stopped' : undefined,
      })),
    )
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
