import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'
describe('authenticated Stop attribution', () => {
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
  it('stores and publishes the authenticated Stop member before interrupt and retains it at completion', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const turn = await startTurn(fixture, runner, session.id, 'first')
    const trace: string[] = []
    const tab = await fixture.tab(0, (message) => {
      if (
        message.type === 'event' &&
        message.envelope.event.type === 'turn.stop-requested'
      )
        trace.push('stop-event')
    })
    let storedAtInterrupt = Promise.resolve<unknown>(null)
    fixture.observeOutgoing((message) => {
      if (message.type === 'interrupt') {
        trace.push('interrupt')
        storedAtInterrupt = fixture.chat.store.read(WORKSPACE_ID, (view) =>
          view.history(0),
        )
      }
      return false
    })
    const path = sessionPaths.interrupt(
      fixture.org.id,
      WORKSPACE_ID,
      session.id,
    )
    const before = await fixture.history(session.id)
    expect(
      (
        await fixture.fetch(
          path,
          { turnId: 'missing-turn', requestedById: fixture.owner.id },
          fixture.memberCookie,
        )
      ).status,
    ).toBe(404)
    expect(await fixture.history(session.id)).toEqual(before)
    const response = await fixture.fetch(
      path,
      { turnId: turn.turnId, requestedById: fixture.owner.id },
      fixture.memberCookie,
    )
    expect(await response.json()).toEqual({
      eventNumber: 7,
      turnId: turn.turnId,
      state: 'stopping',
    })
    expect(trace).toEqual(['stop-event', 'interrupt'])
    const event = {
      type: 'turn.stop-requested',
      sessionId: session.id,
      turnId: turn.turnId,
      requestedById: fixture.member.id,
    }
    expect(await storedAtInterrupt).toMatchObject({
      events: expect.arrayContaining([expect.objectContaining({ event })]),
    })
    runner.emit(terminalEvent(turn, 'stopped'))
    await fixture.drain()
    const history = await fixture.history(session.id)
    expect(
      history.events
        .filter(({ event }) => event.type === 'turn.stop-requested')
        .map(({ event }) => event),
    ).toEqual([event])
    expect(history.events.at(-2)?.event).toMatchObject({
      type: 'turn.completed',
      state: 'stopped',
    })
    runner.sendEnvelope({
      type: 'event',
      streamId: 'fake-stream-1',
      eventNumber: 4,
      occurredAt: 1800000000000,
      event: Object.assign(
        {
          type: 'turn.thinking' as const,
          sessionId: session.id,
          turnId: turn.turnId,
        },
        { type: 'turn.stop-requested', requestedById: fixture.owner.id },
      ),
    })
    await fixture.drain()
    expect(await fixture.history(session.id)).toEqual({
      throughEventNumber: history.throughEventNumber + 1,
      events: [
        ...history.events,
        {
          workspaceId: WORKSPACE_ID,
          eventNumber: history.throughEventNumber + 1,
          occurredAt: 1800000000000,
          event: {
            type: 'runner.event-refused',
            streamId: 'fake-stream-1',
            runnerEventNumber: 4,
            runnerEventType: 'unknown',
            reason: 'invalid',
            sessionId: session.id,
            turnId: turn.turnId,
          },
        },
      ],
    })
    await tab.close()
  })
})
