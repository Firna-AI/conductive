import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import { FakeRunner } from '../test-support/fake-runner'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  endTurn,
  lifecycleSnapshot,
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'
describe('late runner events', () => {
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
  it('replays dropped start, text, tools, and an end after workspace stop without changing a newer turn', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id, 'old-message')
    const old = messageCommands(runner, 'old-message')[0]
    if (old?.type !== 'turn') throw new Error('Expected the old turn.')
    fixture.transport.dropIncoming = (message) => message.type === 'event'
    const dropped = [
      runner.emit({
        type: 'turn.started',
        sessionId: session.id,
        turnId: old.turnId,
        senderId: fixture.owner.id,
        choice: CLAUDE,
        startedAt: TEST_TIME,
        messageIds: ['old-message'],
      }),
      runner.emit({
        type: 'assistant.delta',
        sessionId: session.id,
        turnId: old.turnId,
        messageId: 'old-answer',
        text: 'Keep this text after resume.',
      }),
      runner.emit({
        type: 'tool.updated',
        sessionId: session.id,
        turnId: old.turnId,
        tool: {
          id: 'old-tool',
          kind: 'run',
          target: 'npm run test',
          detail: 'A tool step before the stop.',
          omittedDetailBytes: 0,
          state: 'running',
        },
      }),
    ]
    expect(runner.pendingEvents()).toEqual(dropped)
    await endTurn(fixture, old)
    await fixture.chat.closeRunner()
    await fixture.restart()
    fixture.transport.dropIncoming = () => false
    const resumed = await fixture.connect(
      new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'new-stream' }),
    )
    resumed.emit({ type: 'runner.ready' })
    await fixture.drain()
    const newer = await startTurn(fixture, resumed, session.id, 'new-message')
    await fixture.send(session.id, 'new-unanswered')
    const before = await lifecycleSnapshot(fixture)
    const tab = await fixture.tab()
    const lateEnd = runner.emit(terminalEvent(old, 'finished'))
    await fixture.connect(runner)
    const history = await fixture.history(session.id)
    expect(history.events.slice(-4).map(({ event }) => event)).toEqual([
      ...dropped.map(({ event }) => event),
      lateEnd.event,
    ])
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    expect(before.sessions[0]?.activeTurnId).toBe(newer.turnId)
    expect(before.turns.find((turn) => turn.id === old.turnId)).toMatchObject({
      state: 'stopped',
      started: true,
    })
    expect(messageCommands(runner, 'old-message')).toHaveLength(1)
    expect(runner.pendingEvents()).toEqual([])
    expect(runner.received.at(-1)).toEqual({
      type: 'confirm',
      streamId: 'fake-stream-1',
      throughEventNumber: 5,
    })
    expect(
      tab.messages.filter((message) => message.type === 'event'),
    ).toHaveLength(4)
    runner.sendEnvelope(lateEnd)
    await fixture.drain()
    expect(await fixture.history(session.id)).toEqual(history)
    expect(
      tab.messages.filter((message) => message.type === 'event'),
    ).toHaveLength(4)
    await tab.close()
  })
  it('checks late acknowledgements and unsafe context before appending without message or command changes', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const old = await startTurn(fixture, runner, session.id, 'old-message')
    await fixture.setSendRule({
      type: 'message',
      error: 'Injected steer send failure',
    })
    await fixture.send(session.id, 'unanswered')
    await endTurn(fixture, old)
    await fixture.setSendRule(null)
    await fixture.connect(runner)
    const before = await lifecycleSnapshot(fixture)
    runner.emit({
      ...terminalEvent(old, 'finished'),
      type: 'turn.completed',
      state: 'finished',
      durationMs: 25,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['unanswered', '\ud800'],
    })
    runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: '\ud800',
      messageId: 'unsafe-answer',
      text: 'Do not store this.',
    })
    await fixture.drain()
    expect(
      (
        await fixture.chat.store.read(WORKSPACE_ID, (view) => view.history(0))
      ).events
        .map(({ event }) => event)
        .filter((event) => event.type === 'runner.event-refused'),
    ).toMatchObject([
      { reason: 'invalid', sessionId: session.id, turnId: old.turnId },
      { reason: 'turn_not_active', sessionId: null, turnId: null },
    ])
    const completed = runner.emit({
      type: 'assistant.completed',
      sessionId: session.id,
      turnId: old.turnId,
      messageId: 'late-answer',
      text: 'This answer arrived after the stop.',
      userMessageIds: ['unanswered'],
    })
    await fixture.drain()
    expect((await fixture.history(session.id)).events.at(-1)?.event).toEqual(
      completed.event,
    )
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    expect(runner.pendingEvents()).toEqual([])
  })
  it('keeps old ended data when start evidence is positive or incomplete without reopening a closed session', async () => {
    const fixture = await createChatFixture(harness)
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    for (const [state, sent] of [
      ['stopped', true],
      ['failed', false],
    ] as const) {
      const session = await fixture.createSession()
      const old = await startTurn(
        fixture,
        runner,
        session.id,
        `legacy-${state}`,
      )
      await endTurn(fixture, old, state)
      await fixture.fetch(
        sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
        {
          stopRunningTurn: false,
        },
      )
      await fixture.chat.store.change(
        WORKSPACE_ID,
        async (transaction) => {
          const turn = await transaction.turn(old.turnId)
          const message = await transaction.message(old.message.id)
          if (!turn || !message) throw new Error('The legacy turn is missing.')
          Reflect.deleteProperty(turn, 'started')
          await transaction.saveTurn(turn)
          if (!sent) {
            message.state = 'queued'
            await transaction.saveMessage(message)
          }
        },
        () => undefined,
      )
      const before = await lifecycleSnapshot(fixture)
      const late = runner.emit(terminalEvent(old, 'finished'))
      await fixture.drain()
      expect(
        (await fixture.history(session.id)).events.at(-1)?.event,
        state,
      ).toEqual(late.event)
      expect(await lifecycleSnapshot(fixture), state).toEqual(before)
      expect(runner.pendingEvents(), state).toEqual([])
    }
  })
})
