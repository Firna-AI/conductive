import { expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { CLAUDE, WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import { lifecycleSnapshot, startTurn } from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it('ends a chain at 30 days from member input and does not reset its anchor for an app continuation', async () => {
  const fixture = await fixtureForTest()
  const expired = await fixture.createSession()
  const within = await fixture.createSession()
  const oldest = await startTurn(fixture, fixture.runner, expired.id, 'oldest')
  const newer = await startTurn(fixture, fixture.runner, within.id, 'newer')
  const anchor = fixture.clock.now() - 2_591_999_999
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    for (const [command, createdAt] of [
      [oldest, anchor - 1],
      [newer, anchor],
    ] as const) {
      const turn = await view.turn(command.turnId)
      const message = await view.message(command.message.id)
      if (!turn || !message) throw new Error('Missing legacy turn')
      delete turn.chainStartedAt
      message.createdAt = createdAt
      await view.saveMessage(message)
      await view.saveTurn(turn)
    }
  })
  await fixture.stopForProvider()
  expect(
    (await fixture.history(expired.id)).events.map(({ event }) => event),
  ).toContainEqual(
    expect.objectContaining({
      type: 'turn.continued',
      next: 'message',
      turnId: null,
    }),
  )
  const queued = (await lifecycleSnapshot(fixture)).turns.filter(
    (turn) => turn.state === 'queued',
  )
  expect(queued).toMatchObject([
    { sessionId: within.id, chainStartedAt: anchor },
  ])
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'limit-runner' }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const continuation = runner.commands.find(
    (command) => command.type === 'turn',
  )
  if (continuation?.type !== 'turn') throw new Error('Missing continuation')
  runner.emit({
    type: 'turn.started',
    sessionId: within.id,
    turnId: continuation.turnId,
    senderId: fixture.owner.id,
    choice: CLAUDE,
    startedAt: fixture.clock.now() - 900_000,
    messageIds: [continuation.message.id],
  })
  await fixture.drain()
  await fixture.clock.advance(1)
  await fixture.stopForProvider()
  expect(
    (await lifecycleSnapshot(fixture)).turns.filter(
      (turn) => turn.state === 'queued',
    ),
  ).toEqual([])
  expect(
    (await fixture.history(within.id)).events
      .map(({ event }) => event)
      .filter((event) => event.type === 'turn.continued')
      .at(-1),
  ).toMatchObject({ next: 'message', turnId: null })
})

it('uses 15 minutes of actual runner execution, blocks a never-started continuation, and resets the guard for member input', async () => {
  const fixture = await fixtureForTest()
  const sessions = await Promise.all(
    Array.from({ length: 4 }, () => fixture.createSession()),
  )
  for (const [index, session] of sessions.entries())
    await startTurn(fixture, fixture.runner, session.id, `original-${index}`)
  await fixture.stopForProvider()
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'guard-runner' }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await fixture.clock.advance(1)
  for (const index of [0, 1, 2]) {
    const command = runner.commands.find(
      (command) =>
        command.type === 'turn' && command.sessionId === sessions[index].id,
    )
    if (command?.type !== 'turn') throw new Error('Missing continuation')
    runner.emit({
      type: 'turn.started',
      sessionId: command.sessionId,
      turnId: command.turnId,
      senderId: fixture.owner.id,
      choice: CLAUDE,
      startedAt: fixture.clock.now() - (index === 0 ? 900_000 : 899_999),
      messageIds: [command.message.id],
    })
    await fixture.drain()
  }
  await fixture.send(sessions[2].id, 'new-member-input', fixture.memberCookie)
  await fixture.stopForProvider()
  for (const [index, next] of [
    'turn',
    'message',
    'turn',
    'message',
  ].entries()) {
    expect(
      (await fixture.history(sessions[index].id)).events
        .map(({ event }) => event)
        .filter((event) => event.type === 'turn.continued')
        .at(-1),
    ).toMatchObject({ next })
  }
  const queued = (await lifecycleSnapshot(fixture)).turns.filter(
    (turn) => turn.state === 'queued',
  )
  expect(queued.map((turn) => turn.sessionId).sort()).toEqual(
    [sessions[0].id, sessions[2].id].sort(),
  )
  expect(
    queued.find((turn) => turn.sessionId === sessions[2].id)?.chainStartedAt,
  ).toBe(fixture.clock.now())
})
