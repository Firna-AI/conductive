import { expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { FakeRunner } from '../test-support/fake-runner'
import { WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it.each(['running', 'waiting'] as const)(
  'continues with a fresh app message when a member chose its derived ID in the %s turn',
  async (target) => {
    const fixture = await fixtureForTest()
    const session = await fixture.createSession()
    let active = await startTurn(fixture, fixture.runner, session.id, 'source')
    if (target === 'waiting') {
      await fixture.send(session.id, 'unanswered')
      await fixture.fetch(
        sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
        { turnId: active.turnId },
      )
      await fixture.send(session.id, 'waiting', fixture.memberCookie)
      fixture.runner.emit(terminalEvent(active, 'finished'))
      await fixture.drain()
      const next = messageCommands(fixture.runner, 'unanswered')[1]
      if (next?.type !== 'turn') throw new Error('Missing unanswered turn')
      active = next
      fixture.runner.emit({
        type: 'turn.started',
        sessionId: session.id,
        turnId: active.turnId,
        senderId: fixture.owner.id,
        choice: session.choice,
        startedAt: fixture.clock.now(),
        messageIds: ['unanswered'],
      })
      await fixture.drain()
    }
    const memberId = `continuation:${active.turnId}`
    await fixture.send(session.id, memberId, fixture.memberCookie)
    await fixture.stopForProvider()
    const state = await lifecycleSnapshot(fixture)
    const successor = state.turns.find(
      (turn) => turn.id === state.sessions[0].activeTurnId,
    )
    expect(successor).toMatchObject({
      state: 'queued',
      senderId: fixture.owner.id,
    })
    expect(successor?.id).not.toBe(active.turnId)
    expect(successor?.messageIds[0]).toMatch(/^continuation:/)
    expect(successor?.messageIds[0]).not.toBe(memberId)
    expect(
      state.messages.find((message) => message?.id === memberId),
    ).toMatchObject({
      sender: { id: fixture.member.id },
      text: 'Check this code',
    })
    const waiting = state.turns.find((turn) =>
      turn.messageIds.includes('waiting'),
    )
    expect(successor?.nextTurnId).toBe(
      target === 'waiting' ? waiting?.id : null,
    )
    const before = await lifecycleSnapshot(fixture)
    await fixture.stopForProvider()
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    expect(
      (await fixture.history(session.id)).events.filter(
        ({ event }) => event.type === 'turn.continued',
      ),
    ).toHaveLength(1)
    const runner = await fixture.connect(
      new FakeRunner({
        workspaceId: WORKSPACE_ID,
        streamId: `collision-${target}`,
      }),
    )
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const command = runner.commands.find(
      (command) => command.type === 'turn' && command.turnId === successor?.id,
    )
    expect(command).toMatchObject({
      type: 'turn',
      message: { id: successor?.messageIds[0] },
    })
    if (command?.type !== 'turn')
      throw new Error('Missing provider continuation')
    if (target === 'waiting') {
      runner.emit(terminalEvent(command, 'finished'))
      await fixture.drain()
    }
    expect(messageCommands(runner, memberId)).toMatchObject([
      {
        type: 'message',
        turnId: target === 'waiting' ? waiting?.id : successor?.id,
        message: { id: memberId, sender: { id: fixture.member.id } },
      },
    ])
    await fixture.send(session.id, 'later')
    expect(messageCommands(runner, 'later')).toMatchObject([
      { type: 'message' },
    ])
  },
)
