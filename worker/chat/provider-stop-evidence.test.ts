import { expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
  terminalEvent,
} from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it('waits for the old end and uses a replayed start before dispatching recovery input across eviction', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  await fixture.send(session.id, 'source')
  const original = messageCommands(fixture.runner, 'source')[0]
  if (original?.type !== 'turn') throw new Error('Missing original turn')
  await fixture.send(session.id, 'unanswered')
  await fixture.disconnect(fixture.runner)
  fixture.runner.emit({
    type: 'turn.started',
    sessionId: session.id,
    turnId: original.turnId,
    senderId: fixture.owner.id,
    choice: session.choice,
    startedAt: fixture.clock.now(),
    messageIds: ['source'],
  })
  await fixture.stopForProvider()
  const pending = await lifecycleSnapshot(fixture)
  const successor = pending.sessions[0].activeTurnId
  expect(
    pending.turns.find((turn) => turn.id === successor)?.messageIds,
  ).toEqual(['source', 'unanswered'])
  await fixture.stopForProvider()
  expect(await lifecycleSnapshot(fixture)).toEqual(pending)
  await fixture.restart()
  await fixture.connect(fixture.runner)
  expect(
    fixture.runner.commands.filter((command) => command.type === 'turn'),
  ).toHaveLength(1)
  await fixture.restart()
  await fixture.connect(fixture.runner)
  expect(
    fixture.runner.commands.filter((command) => command.type === 'turn'),
  ).toHaveLength(1)
  const ended = fixture.runner.emit(terminalEvent(original, 'stopped'))
  await fixture.drain()
  const recovery = fixture.runner.commands
    .filter((command) => command.type === 'turn')
    .at(-1)
  expect(recovery).toMatchObject({
    type: 'turn',
    turnId: successor,
    message: {
      id: expect.stringMatching(/^continuation:/),
      sender: { id: fixture.owner.id },
      text: expect.stringContaining('check whether it already happened.'),
    },
  })
  if (recovery?.type !== 'turn') throw new Error('Missing recovery turn')
  expect(recovery.message.text).toContain(`read_session`)
  expect(recovery.message.text).toContain(session.id)
  expect(messageCommands(fixture.runner, 'source')).toHaveLength(1)
  expect(messageCommands(fixture.runner, 'unanswered').at(-1)).toMatchObject({
    type: 'message',
    turnId: successor,
  })
  const chosen = await lifecycleSnapshot(fixture)
  expect(chosen.turns.find((turn) => turn.id === successor)).toMatchObject({
    chainStartedAt: fixture.clock.now(),
    messageIds: [recovery.message.id, 'unanswered'],
  })
  expect(
    chosen.turns.find((turn) => turn.id === original.turnId),
  ).toMatchObject({ state: 'stopped', endReason: 'cloud_computer_stopped' })
  fixture.runner.sendEnvelope(ended)
  await fixture.drain()
  expect(await lifecycleSnapshot(fixture)).toEqual(chosen)
})

it('waits for Stop to confirm a lost dispatch and then resends its original messages unchanged', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  await fixture.setSendRule({ type: 'turn', drop: true })
  const accepted = await fixture.send(session.id, 'not-received')
  const originalTurnId = accepted.session.activeTurnId
  if (!originalTurnId) throw new Error('Missing original turn')
  expect(fixture.runner.commands).toEqual([])
  await fixture.stopForProvider()
  await fixture.setSendRule(null)
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'never-received' }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(runner.commands.map((command) => command.type)).toEqual(['interrupt'])
  runner.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId: originalTurnId,
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [],
  })
  await fixture.drain()
  expect(runner.commands.map((command) => command.type)).toEqual([
    'interrupt',
    'turn',
  ])
  expect(messageCommands(runner, 'not-received')).toMatchObject([
    {
      type: 'turn',
      message: { ...accepted.message, state: 'sent' },
      attachments: [],
    },
  ])
  expect(
    (await lifecycleSnapshot(fixture)).messages.filter((message) =>
      message?.id.startsWith('continuation:'),
    ),
  ).toEqual([])
})

it('uses the restarted runner end as start proof when no start event replays', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  await fixture.send(session.id, 'source')
  const original = messageCommands(fixture.runner, 'source')[0]
  if (original?.type !== 'turn') throw new Error('Missing original turn')
  await fixture.stopForProvider()
  const runner = await fixture.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: 'restarted-with-end',
    }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  runner.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId: original.turnId,
    state: 'stopped',
    durationMs: 0,
    files: [],
    filesUnavailable: true,
    omittedFileCount: 0,
    userMessageIds: ['source'],
  })
  await fixture.drain()
  expect(
    runner.commands.filter((command) => command.type === 'turn'),
  ).toMatchObject([
    {
      type: 'turn',
      message: {
        id: expect.stringMatching(/^continuation:/),
        text: expect.stringContaining('check whether it already happened.'),
      },
    },
  ])
  expect(messageCommands(runner, 'source')).toEqual([])
})
