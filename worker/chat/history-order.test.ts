import { expect, it } from 'vitest'

import { SessionLog } from '../../src/shared/transcript/session-log'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { choice, context } from './runner-fixtures.test-support'
import {
  forgetPositionIndex,
  historyPages,
  itemRows,
  mergeHistory,
  mergeLive,
  orderedHistoryFixture,
  tool,
} from './history-order.test-support'

it('keeps live item order and first times in compacted pages and old or new caches', async () => {
  const fixture = await orderedHistoryFixture()
  const expected = [
    { kind: 'answer', text: 'Final answer', at: 11 },
    {
      kind: 'tool',
      id: 'first-tool',
      detail: 'Final first detail',
      state: 'done',
      at: 12,
    },
    {
      kind: 'tool',
      id: 'second-tool',
      detail: 'Final second detail',
      state: 'done',
      at: 13,
    },
    { kind: 'turn-end', at: 20 },
  ]
  const live = new SessionLog()
  mergeLive(live, fixture.published)
  expect(itemRows(live)).toEqual(expected)

  const pages = await historyPages(fixture)
  expect(pages.map((page) => page.nextAfterEventNumber ?? null)).toEqual([
    32,
    null,
  ])
  const replay = new SessionLog()
  for (const page of pages) mergeHistory(replay, page)
  expect(itemRows(replay)).toEqual(expected)
  const old = new SessionLog()
  mergeLive(old, fixture.published.slice(0, 4))
  for (const page of pages) mergeHistory(old, page)
  expect(itemRows(old)).toEqual(expected)
  const oldCompacted = new SessionLog()
  for (const page of pages)
    mergeHistory(oldCompacted, {
      ...page,
      events: page.events.filter(
        ({ eventNumber }) => ![2, 3, 4].includes(eventNumber),
      ),
    })
  for (const page of pages) mergeHistory(oldCompacted, page)
  expect(itemRows(oldCompacted)).toEqual(expected)
  mergeLive(replay, fixture.published)
  expect(itemRows(replay)).toEqual(expected)
  const payload = JSON.stringify(pages)
  for (const intermediate of [
    'partial-answer-first',
    'partial-answer-next',
    'detail-running-A',
    'detail-running-B',
    'detail-intermediate-A',
  ])
    expect(payload).not.toContain(intermediate)
  await forgetPositionIndex(fixture.storage)
  const legacy = new SessionLog()
  for (const page of await historyPages(fixture)) mergeHistory(legacy, page)
  expect(itemRows(legacy)).toEqual(expected)
})

it('keeps late first positions without changing a newer running turn', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.read(async (view) => {
    const previous = await view.turn('turn')
    const session = await view.session('session')
    if (!previous || !session) throw new Error('The stored turn is missing.')
    await view.saveTurn({ ...previous, state: 'stopped', started: true })
    await view.saveTurn({
      id: 'newer',
      sessionId: 'session',
      senderId: 'sender',
      messageIds: [],
      state: 'running',
      started: true,
      startedAt: 25,
      closeAfterStop: false,
    })
    await view.saveSession({ ...session, activeTurnId: 'newer' })
  })
  await fixture.receive(1, {
    ...context,
    type: 'turn.started',
    turnId: 'newer',
    senderId: 'sender',
    choice,
    startedAt: 25,
    messageIds: [],
  })
  await fixture.receive(
    2,
    {
      ...context,
      type: 'assistant.delta',
      messageId: 'late-answer',
      text: 'discarded late text',
    },
    { occurredAt: 30 },
  )
  await fixture.receive(
    3,
    {
      ...context,
      type: 'tool.updated',
      tool: { ...tool, state: 'running', detail: 'discarded late detail' },
    },
    { occurredAt: 31 },
  )
  await fixture.receive(
    4,
    {
      ...context,
      type: 'tool.updated',
      tool: { ...tool, state: 'done', detail: 'Final late detail' },
    },
    { occurredAt: 32 },
  )
  await fixture.receive(
    5,
    {
      ...context,
      type: 'assistant.completed',
      messageId: 'late-answer',
      text: 'Final late answer',
      userMessageIds: [],
    },
    { occurredAt: 33 },
  )
  const live = new SessionLog()
  mergeLive(live, fixture.published)
  const expected = [
    { kind: 'answer', text: 'Final late answer', at: 30 },
    {
      kind: 'tool',
      id: 'first-tool',
      detail: 'Final late detail',
      state: 'done',
      at: 31,
    },
  ]
  expect(itemRows(live)).toEqual(expected)
  const replay = new SessionLog()
  const pages = await historyPages(fixture)
  expect(pages[0]?.events.slice(1, 3)).toEqual([
    {
      workspaceId: 'workspace',
      eventNumber: 2,
      occurredAt: 30,
      late: true,
      event: {
        ...context,
        type: 'assistant.delta',
        messageId: 'late-answer',
        text: '',
      },
    },
    {
      workspaceId: 'workspace',
      eventNumber: 3,
      occurredAt: 31,
      late: true,
      event: {
        ...context,
        type: 'tool.updated',
        tool: {
          ...tool,
          state: 'running',
          detail: null,
          omittedDetailBytes: 0,
        },
      },
    },
  ])
  for (const page of pages) mergeHistory(replay, page)
  expect(itemRows(replay)).toEqual(expected)
  expect(replay.transcript.turn).toEqual({
    turnId: 'newer',
    startedAt: 25,
    choice,
    thinking: false,
  })
  expect(replay.transcript.turns).toEqual([
    { id: 'newer', ended: false, messageIds: [] },
  ])
  expect(
    pages[0]?.events
      .filter(({ late }) => late)
      .map(({ eventNumber, occurredAt, late }) => ({
        eventNumber,
        occurredAt,
        late,
      })),
  ).toEqual([
    { eventNumber: 2, occurredAt: 30, late: true },
    { eventNumber: 3, occurredAt: 31, late: true },
    { eventNumber: 4, occurredAt: 32, late: true },
    { eventNumber: 5, occurredAt: 33, late: true },
  ])
})
