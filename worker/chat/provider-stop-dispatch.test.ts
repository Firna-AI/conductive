import { expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { sessionPaths } from '../../src/shared/sessions'
import { WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import {
  lifecycleSnapshot,
  startTurn,
  terminalEvent,
  messageCommands,
} from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it('sends the old interrupt before the continuation and removes it only after the old runner end', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  const previous = await startTurn(
    fixture,
    fixture.runner,
    session.id,
    'source',
  )
  await fixture.stopForProvider()
  const replacement = await fixture.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: 'provider-replacement',
    }),
  )
  replacement.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(replacement.commands.map((command) => command.type)).toEqual([
    'interrupt',
    'turn',
  ])
  expect(replacement.commands[0]).toMatchObject({ turnId: previous.turnId })
  const next = replacement.commands[1]
  expect(next).toMatchObject({
    type: 'turn',
    message: { id: expect.stringMatching(/^continuation:/) },
  })
  const pending = await lifecycleSnapshot(fixture)
  expect(
    pending.commands.filter((command) => command.type === 'interrupt'),
  ).toHaveLength(1)
  replacement.emit(terminalEvent(previous, 'stopped'))
  await fixture.drain()
  const ended = await lifecycleSnapshot(fixture)
  expect(
    ended.commands.filter((command) => command.type === 'interrupt'),
  ).toEqual([])
  expect(ended.turns.find((turn) => turn.id === previous.turnId)).toMatchObject(
    { state: 'stopped', endReason: 'cloud_computer_stopped' },
  )
  await fixture.disconnect(replacement)
  const again = await fixture.connect(replacement)
  again.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(
    again.commands.filter((command) => command.type === 'interrupt'),
  ).toHaveLength(1)
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    ),
  ).toMatchObject({ activeTurnId: next?.type === 'turn' ? next.turnId : null })
})

it('inserts a provider continuation before existing waiting work without joining its sender or messages', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  const first = await startTurn(fixture, fixture.runner, session.id, 'first')
  await fixture.send(session.id, 'unanswered')
  await fixture.fetch(
    sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
    { turnId: first.turnId },
  )
  await fixture.send(session.id, 'waiting', fixture.memberCookie)
  fixture.runner.emit(terminalEvent(first, 'finished'))
  await fixture.drain()
  const active = messageCommands(fixture.runner, 'unanswered')[1]
  if (active?.type !== 'turn') throw new Error('Missing unanswered turn')
  fixture.runner.emit({
    type: 'turn.started',
    sessionId: session.id,
    turnId: active.turnId,
    senderId: fixture.owner.id,
    choice: active.message.choice,
    startedAt: fixture.clock.now(),
    messageIds: ['unanswered'],
  })
  await fixture.drain()
  await fixture.stopForProvider()
  const state = await lifecycleSnapshot(fixture)
  const next = state.turns.find(
    (turn) => turn.id === state.sessions[0].activeTurnId,
  )
  const waiting = state.turns.find((turn) =>
    turn.messageIds.includes('waiting'),
  )
  expect(next).toMatchObject({
    state: 'queued',
    senderId: fixture.owner.id,
    nextTurnId: waiting?.id,
  })
  expect(waiting).toMatchObject({
    state: 'queued',
    senderId: fixture.member.id,
    messageIds: ['waiting'],
  })
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'waiting-runner' }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(messageCommands(runner, 'waiting')).toEqual([])
  const continuation = runner.commands.find(
    (command) => command.type === 'turn',
  )
  if (continuation?.type !== 'turn')
    throw new Error('Missing provider continuation')
  runner.emit(terminalEvent(continuation, 'finished'))
  await fixture.drain()
  expect(messageCommands(runner, 'waiting')).toMatchObject([
    {
      type: 'turn',
      turnId: waiting?.id,
      message: { sender: { id: fixture.member.id } },
    },
  ])
})
