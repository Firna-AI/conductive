import { expect, it } from 'vitest'

import type { SendMessageResponse } from '../../src/shared/messages'
import { FakeRunner } from '../test-support/fake-runner'
import { WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import { retryRequest } from './retry.test-support'
import {
  lifecycleSnapshot,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it.each(['same', 'linked'] as const)(
  'retries a failed continuation with hidden text and the original chain in a %s session',
  async (target) => {
    const fixture = await fixtureForTest()
    const session = await fixture.createSession()
    await startTurn(fixture, fixture.runner, session.id, 'source')
    const chainStartedAt = fixture.clock.now()
    await fixture.stopForProvider()
    const runner = await fixture.connect(
      new FakeRunner({
        workspaceId: WORKSPACE_ID,
        streamId: 'failed-continuation',
      }),
    )
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const continuation = runner.commands.find(
      (command) => command.type === 'turn',
    )
    if (continuation?.type !== 'turn') throw new Error('Missing continuation')
    runner.emit(terminalEvent(continuation, 'failed'))
    await fixture.drain()
    await fixture.disconnect(runner)
    await fixture.clock.advance(1)
    if (target === 'linked') {
      await fixture.harness.env.DB.prepare(
        'DELETE FROM agent_logins WHERE user_id = ?',
      )
        .bind(fixture.owner.id)
        .run()
    }
    const response = await retryRequest(
      fixture,
      session.id,
      continuation.message.id,
      fixture.memberCookie,
    )
    expect(response.status).toBe(202)
    const retried: SendMessageResponse = await response.json()
    expect(retried.message.id).toMatch(/^continuation:/)
    expect(retried.message.id).not.toBe(continuation.message.id)
    expect(retried.message).toMatchObject({
      sender: { id: fixture.member.id },
      text: continuation.message.text,
      state: 'queued',
    })
    expect(retried.session.sourceSessionId).toBe(
      target === 'linked' ? session.id : null,
    )
    const state = await lifecycleSnapshot(fixture)
    expect(
      state.turns.find((turn) => turn.id === retried.session.activeTurnId),
    ).toMatchObject({
      state: 'queued',
      senderId: fixture.member.id,
      messageIds: [retried.message.id],
      chainStartedAt,
      providerContinuationStartedAt: null,
    })
    const events = (await fixture.history(retried.session.id)).events.map(
      ({ event }) => event,
    )
    expect(
      events.filter(
        (event) =>
          event.type === 'message.accepted' &&
          event.message.text === continuation.message.text,
      ),
    ).toEqual([])
    expect(retried.session.title).toBe(
      target === 'linked' ? null : 'Check this code',
    )
    const replacement = await fixture.connect(
      new FakeRunner({
        workspaceId: WORKSPACE_ID,
        streamId: 'retried-continuation',
      }),
    )
    replacement.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(
      replacement.commands.filter((command) => command.type === 'turn'),
    ).toMatchObject([
      {
        type: 'turn',
        turnId: retried.session.activeTurnId,
        message: {
          id: retried.message.id,
          sender: { id: fixture.member.id },
          text: continuation.message.text,
        },
      },
    ])
  },
)
