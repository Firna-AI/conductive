import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { WorkspaceSocketMessage } from '../../src/shared/events'
import { chatHistoryPath } from '../../src/shared/events'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

describe('workspace chat event delivery', () => {
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

  it('sends history before concurrent live events to each tab without gaps', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const first = await fixture.tab()
    let duringHistory: Promise<unknown> = Promise.resolve()
    const second = await fixture.tab(0, (message) => {
      if (message.type === 'history') duringHistory = fixture.send(session.id)
    })
    await duringHistory
    await fixture.drain()
    expect(second.messages[0]).toEqual({
      type: 'history',
      history: {
        events: [
          expect.objectContaining({
            eventNumber: 1,
            event: { type: 'session.updated', session },
          }),
        ],
        throughEventNumber: 1,
      },
    })
    const live = (messages: readonly WorkspaceSocketMessage[]) =>
      messages.filter((message) => message.type === 'event')
    expect(live(first.messages)).toEqual(live(second.messages))
    expect(
      live(second.messages).map((message) => message.envelope.eventNumber),
    ).toEqual([2, 3])
    const reconnect = await fixture.tab(2)
    expect(reconnect.messages).toEqual([
      {
        type: 'history',
        history: {
          events: [expect.objectContaining({ eventNumber: 3 })],
          throughEventNumber: 3,
        },
      },
    ])
    first.close()
    second.close()
    reconnect.close()
  })

  it('resends a gap and confirms duplicates once across reconnects and streams', async () => {
    const fixture = await createChatFixture(harness, {
      runnerReady: async (workspaceId, publish) => {
        await publish({ type: 'workspace.title', name: `Ready ${workspaceId}` })
      },
      runnerEventStored: async (envelope, publish) => {
        if (envelope.event.type === 'assistant.delta') {
          await publish({ type: 'workspace.title', name: 'Projected delta' })
        }
      },
    })
    const session = await fixture.createSession()
    const tab = await fixture.tab()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const command = runner.commands[0]
    if (command?.type !== 'turn') throw new Error('Expected a turn.')
    let skipped = false
    fixture.transport.dropIncoming = (message) => {
      if (message.type === 'event' && message.eventNumber === 2 && !skipped) {
        skipped = true
        return true
      }
      return false
    }
    runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: command.turnId,
      messageId: 'answer',
      text: 'First',
    })
    const last = runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: command.turnId,
      messageId: 'answer',
      text: ' second',
    })
    await fixture.drain()
    expect(runner.received).toContainEqual({
      type: 'resend',
      streamId: 'fake-stream-1',
      fromEventNumber: 2,
    })
    const beforeDuplicate = await fixture.history(session.id)
    runner.sendEnvelope(last)
    await fixture.drain()
    expect(await fixture.history(session.id)).toEqual(beforeDuplicate)
    expect(
      tab.messages.filter(
        (message) =>
          message.type === 'event' &&
          message.envelope.event.type === 'assistant.delta',
      ),
    ).toHaveLength(2)
    runner.disconnect()
    runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: command.turnId,
      messageId: 'answer',
      text: ' offline',
    })
    fixture.restart()
    await fixture.connect(runner)
    expect(runner.received).toContainEqual({
      type: 'welcome',
      protocolVersion: 1,
      streamId: 'fake-stream-1',
      confirmedThrough: 3,
    })
    expect(runner.pendingEvents()).toEqual([])
    await fixture.send(session.id, 'after-reconnect')
    expect(runner.commands.at(-1)?.type).toBe('message')
    const another = await fixture.connect(
      new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'another-stream' }),
    )
    another.emit({ type: 'runner.ready' })
    another.emit({ type: 'workspace.title', name: 'A new title' })
    await fixture.drain()
    const all = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.history(0),
    )
    expect(all.events.map(({ event }) => event)).toContainEqual({
      type: 'workspace.title',
      name: `Ready ${WORKSPACE_ID}`,
    })
    expect(all.events.map(({ event }) => event)).toContainEqual({
      type: 'workspace.title',
      name: 'Projected delta',
    })
    expect(all.events.map((event) => event.eventNumber)).toEqual(
      Array.from({ length: all.events.length }, (_, index) => index + 1),
    )
    expect(all.events.at(-1)?.event).toEqual({
      type: 'workspace.title',
      name: 'A new title',
    })
    const history = await fixture.history(session.id)
    expect(history.throughEventNumber).toBe(all.throughEventNumber)
    expect(history.events.at(-1)?.event.type).not.toBe('workspace.title')
  })

  it('sends every history page before a concurrent live event and pages empty session projections', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    await fixture.chat.changeWorkspace(WORKSPACE_ID, async (transaction) => {
      for (let number = 1; number <= 70; number++)
        await transaction.emit({ type: 'workspace.title', name: `${number}` })
    })
    let concurrent: Promise<void> | undefined
    const tab = await fixture.tab(0, (message) => {
      if (message.type === 'history' && concurrent === undefined)
        concurrent = fixture.chat.appendWorkspaceEvent(WORKSPACE_ID, {
          type: 'workspace.title',
          name: 'Live',
        })
    })
    await concurrent
    const pages = tab.messages.filter((message) => message.type === 'history')
    expect(
      pages.map((message) => [
        message.history.throughEventNumber,
        message.history.nextAfterEventNumber ?? null,
      ]),
    ).toEqual([
      [71, 32],
      [71, 64],
      [71, null],
    ])
    expect(
      pages.flatMap((message) =>
        message.history.events.map((entry) => entry.eventNumber),
      ),
    ).toEqual(Array.from({ length: 71 }, (_, index) => index + 1))
    expect(tab.messages.at(-1)).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 72,
        event: { type: 'workspace.title', name: 'Live' },
      },
    })
    const first = await fixture.fetch(
      chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id),
    )
    expect(await first.json()).toMatchObject({
      throughEventNumber: 72,
      hasMore: true,
      nextAfterEventNumber: 32,
      events: [expect.objectContaining({ eventNumber: 1 })],
    })
    await fixture.chat.appendWorkspaceEvent(WORKSPACE_ID, {
      type: 'workspace.title',
      name: 'After the snapshot',
    })
    const second = await fixture.fetch(
      chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id, 32, 72),
    )
    expect(await second.json()).toEqual({
      throughEventNumber: 72,
      hasMore: true,
      nextAfterEventNumber: 64,
      events: [],
    })
    const final = await fixture.fetch(
      chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id, 64, 72),
    )
    expect(await final.json()).toEqual({ throughEventNumber: 72, events: [] })
    tab.close()
  })
})
