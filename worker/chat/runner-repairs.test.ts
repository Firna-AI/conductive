import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { RUNNER_EVENT_MAX_BYTES } from '../../src/shared/runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { startTurn } from './turn-lifecycle.test-support'
import {
  fullReport,
  oversizedReport,
  refreshCommands,
  reportKinds,
  refusedEvents,
} from './runner-repairs.test-support'
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

it('requests all workspace reports without a login, coalesces losses, and resets only on complete reports', async () => {
  const fixture = await createChatFixture(harness)
  await harness.env.DB.prepare('DELETE FROM agent_logins').run()
  const runner = await fixture.connect()
  for (const kind of reportKinds) runner.emit(oversizedReport(kind))
  await fixture.drain()
  const initial = refreshCommands(runner)
  expect(initial.map((command) => command.kind)).toEqual(reportKinds)
  expect(new Set(initial.map((command) => command.commandId)).size).toBe(5)
  expect(await refusedEvents(fixture)).toEqual(
    reportKinds.map((runnerEventType, index) => ({
      type: 'runner.event-refused',
      streamId: 'fake-stream-1',
      runnerEventNumber: index + 1,
      runnerEventType,
      reason: 'too_large',
      sessionId: null,
      turnId: null,
    })),
  )
  for (const kind of reportKinds) runner.emit(oversizedReport(kind, 2))
  await fixture.drain()
  expect(refreshCommands(runner)).toEqual(initial)
  expect((await refusedEvents(fixture)).slice(5)).toEqual(
    reportKinds.map((runnerEventType, index) => ({
      type: 'runner.event-refused',
      streamId: 'fake-stream-1',
      runnerEventNumber: index + 6,
      runnerEventType,
      reason: 'too_large',
      sessionId: null,
      turnId: null,
      repairFailed: true,
    })),
  )
  await fixture.restart()
  await fixture.connect(runner)
  expect(refreshCommands(runner)).toEqual(initial)
  for (const kind of reportKinds) runner.emit(fullReport(kind, 3))
  await fixture.drain()
  for (const kind of reportKinds) runner.emit(oversizedReport(kind, 4))
  await fixture.drain()
  const next = refreshCommands(runner).slice(5)
  expect(next.map((command) => command.kind)).toEqual(reportKinds)
  expect(
    next.every(
      (command) =>
        !initial.some((previous) => previous.commandId === command.commandId),
    ),
  ).toBe(true)
  expect(
    (await refusedEvents(fixture)).slice(10).map((event) => event.repairFailed),
  ).toEqual([undefined, undefined, undefined, undefined, undefined])
})
it('delivers repair commands during an active turn and ignores nonreplaceable refusals', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'ask')
  runner.emit(oversizedReport('files.snapshot'))
  runner.emit(fullReport('workspace.title'))
  runner.emit({
    type: 'assistant.delta',
    sessionId: session.id,
    turnId: turn.turnId,
    messageId: 'answer',
    text: 'Still running',
  })
  runner.emit({
    type: 'turn.thinking',
    sessionId: session.id,
    turnId: 'missing',
  })
  runner.emit(
    Object.assign(
      { type: 'runner.ready' as const },
      { discarded: 'x'.repeat(RUNNER_EVENT_MAX_BYTES) },
    ),
  )
  runner.emit(
    Object.assign({ type: 'runner.ready' as const }, { type: 'sdk.unknown' }),
  )
  await fixture.drain()
  expect(refreshCommands(runner).map((command) => command.kind)).toEqual([
    'files.snapshot',
  ])
  expect(
    (
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(turn.turnId),
      )
    )?.state,
  ).toBe('running')
  await fixture.send(session.id, 'steer')
  expect(runner.commands.at(-1)).toMatchObject({
    type: 'message',
    turnId: turn.turnId,
    message: { id: 'steer' },
  })
  runner.emit(oversizedReport('files.snapshot', 2))
  await fixture.drain()
  expect(refreshCommands(runner)).toHaveLength(1)
  expect((await refusedEvents(fixture)).at(-1)).toMatchObject({
    runnerEventType: 'files.snapshot',
    repairFailed: true,
  })
})
