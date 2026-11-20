import { expect, it } from 'vitest'

import { WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import { lifecycleSnapshot, startTurn } from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it('continues two running sessions for their original senders and keeps unacknowledged member input', async () => {
  const fixture = await fixtureForTest()
  const first = await fixture.createSession()
  const second = await fixture.createSession()
  const one = await startTurn(fixture, fixture.runner, first.id, 'one')
  await fixture.send(second.id, 'two', fixture.memberCookie)
  const two = fixture.runner.commands.find(
    (command) => command.type === 'turn' && command.sessionId === second.id,
  )
  if (two?.type !== 'turn') throw new Error('Missing second sender turn')
  fixture.runner.emit({
    type: 'turn.started',
    sessionId: second.id,
    turnId: two.turnId,
    senderId: fixture.member.id,
    choice: second.choice,
    startedAt: fixture.clock.now(),
    messageIds: ['two'],
  })
  await fixture.drain()
  await fixture.setSendRule({ type: 'message', drop: true })
  await fixture.send(first.id, 'in-detection-window', fixture.memberCookie)
  await fixture.stopForProvider()
  const state = await lifecycleSnapshot(fixture)
  expect(state.turns.filter((turn) => turn.state === 'queued')).toHaveLength(2)
  for (const previous of [one, two]) {
    const events = (await fixture.history(previous.sessionId)).events.map(
      ({ event }) => event,
    )
    expect(events).toContainEqual({
      type: 'turn.completed',
      sessionId: previous.sessionId,
      turnId: previous.turnId,
      state: 'stopped',
      endReason: 'cloud_computer_stopped',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds:
        previous === one ? ['one', 'in-detection-window'] : ['two'],
    })
    const next = state.turns.find(
      (turn) =>
        turn.sessionId === previous.sessionId && turn.state === 'queued',
    )
    expect(next).toMatchObject({
      sessionId: previous.sessionId,
      senderId: previous.message.sender.id,
      state: 'queued',
      closeAfterStop: false,
      stopRequest: null,
    })
    expect(events).toContainEqual({
      type: 'turn.continued',
      sessionId: previous.sessionId,
      previousTurnId: previous.turnId,
      turnId: next?.id,
      next: 'turn',
    })
    expect(
      events.filter((event) => event.type === 'message.accepted'),
    ).toHaveLength(previous === one ? 2 : 1)
    expect(
      state.messages.find((message) => message?.id === next?.messageIds[0]),
    ).toMatchObject({
      sender: { id: previous.message.sender.id },
      state: 'queued',
      attachments: [],
      text: expect.stringContaining(
        'Continue the task from where you stopped.',
      ),
    })
  }
  const next = state.turns.find(
    (turn) =>
      turn.messageIds.includes('in-detection-window') &&
      turn.state === 'queued',
  )
  expect(next?.messageIds).toEqual([
    expect.stringMatching(/^continuation:/),
    'in-detection-window',
  ])
  expect(
    state.commands.filter((command) => command.type === 'interrupt'),
  ).toHaveLength(2)
  expect(
    state.commands.filter(
      (command) =>
        'messageId' in command && command.messageId === 'in-detection-window',
    ),
  ).toMatchObject([{ type: 'message', turnId: next?.id }])
  const before = await lifecycleSnapshot(fixture)
  await fixture.stopForProvider()
  expect(await lifecycleSnapshot(fixture)).toEqual(before)
})

it('requeues a dispatched turn the runner never started without an app message', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  await fixture.send(session.id, 'not-started')
  const previous = fixture.runner.commands.find(
    (command) => command.type === 'turn',
  )
  if (previous?.type !== 'turn') throw new Error('Missing dispatched turn')
  await fixture.stopForProvider()
  const state = await lifecycleSnapshot(fixture)
  const next = state.turns.find((turn) => turn.state === 'queued')
  expect(next?.messageIds).toEqual(['not-started'])
  expect(next?.senderId).toBe(fixture.owner.id)
  expect(
    state.commands.filter((command) => 'messageId' in command),
  ).toMatchObject([
    { type: 'turn', messageId: 'not-started', turnId: next?.id },
  ])
  expect(
    (await fixture.history(session.id)).events.map(({ event }) => event),
  ).toContainEqual({
    type: 'turn.continued',
    sessionId: session.id,
    previousTurnId: previous.turnId,
    turnId: next?.id,
    next: 'turn',
  })
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    ),
  ).toMatchObject({ activeTurnId: next?.id })
})
