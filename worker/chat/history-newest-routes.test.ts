import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  readNewestStoredEvents,
  readStoredEvents,
} from '../../src/chat/api/read-workspace'
import { UnreadableResponse } from '../../src/chat/api/json'
import { chatHistoryPath } from '../../src/shared/events'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { CHAT_EVENT_PREFIX } from './storage-keys'

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

it('serves reverse session pages through the route without changing forward reads', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    for (let number = 2; number <= 40; number++)
      await view.emit({
        type: 'assistant.completed',
        sessionId: session.id,
        turnId: 'turn',
        messageId: `answer-${number}`,
        text: `Answer ${number}`,
        userMessageIds: [],
      })
  })
  const newestPath = chatHistoryPath(
    fixture.org.id,
    WORKSPACE_ID,
    session.id,
    { order: 'newest', beforeEventNumber: 4 },
    5,
  )
  const newestResponse = await fixture.fetch(newestPath)
  expect(newestResponse.status).toBe(200)
  const newest: unknown = await newestResponse.json()
  const parsed = readNewestStoredEvents(newest)
  expect(parsed.envelopes.map(({ eventNumber }) => eventNumber)).toEqual([
    1, 2, 3,
  ])
  expect(parsed.throughEventNumber).toBe(5)
  expect(parsed.nextBeforeEventNumber).toBeNull()
  expect(newest).not.toHaveProperty('nextAfterEventNumber')
  const firstResponse = await fixture.fetch(
    chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id, {
      order: 'newest',
    }),
  )
  const first = readNewestStoredEvents(await firstResponse.json())
  expect(first.envelopes.map(({ eventNumber }) => eventNumber)).toEqual(
    Array.from({ length: 40 }, (_, index) => index + 1),
  )
  expect(first.throughEventNumber).toBe(40)
  expect(first.nextBeforeEventNumber).toBeNull()
  const forwardResponse = await fixture.fetch(
    chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id, 2, 5),
  )
  expect(
    readStoredEvents(await forwardResponse.json()).envelopes.map(
      ({ eventNumber }) => eventNumber,
    ),
  ).toEqual([3, 4, 5])
})

it('checks session access before reverse history and gives the forward refusal for an unreachable session', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
    type: 'assistant.completed',
    sessionId: session.id,
    turnId: 'turn',
    messageId: 'answer',
    text: 'Private answer',
    userMessageIds: [],
  })
  const allowed = await fixture.fetch(
    chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id, {
      order: 'newest',
      beforeEventNumber: 2,
    }),
    undefined,
    fixture.memberCookie,
  )
  expect(
    readNewestStoredEvents(await allowed.json()).envelopes.map(
      ({ eventNumber }) => eventNumber,
    ),
  ).toEqual([1])
  const other = harness.native.actor('other-workspace')
  await other.api.chat.changeWorkspace('other-workspace', (view) =>
    view.saveSession({
      ...session,
      id: 'other-session',
      workspaceId: 'other-workspace',
    }),
  )
  const lists: DurableObjectListOptions[] = []
  await fixture.setStorageHooks({
    afterList: async (options) => {
      lists.push(options)
    },
  })
  for (const sessionId of ['missing', 'other-session']) {
    const forward = await fixture.fetch(
      chatHistoryPath(fixture.org.id, WORKSPACE_ID, sessionId),
      undefined,
      fixture.memberCookie,
    )
    const newest = await fixture.fetch(
      chatHistoryPath(fixture.org.id, WORKSPACE_ID, sessionId, {
        order: 'newest',
      }),
      undefined,
      fixture.memberCookie,
    )
    expect(forward.status).toBe(404)
    expect(newest.status).toBe(404)
    expect(await newest.json()).toEqual(await forward.json())
  }
  expect(lists.filter(({ prefix }) => prefix === CHAT_EVENT_PREFIX)).toEqual([])
})

it('reads reverse cursors and makes a partial newest page unreadable by the forward reader', () => {
  const page = {
    events: [
      {
        workspaceId: 'workspace',
        eventNumber: 9,
        occurredAt: 25,
        event: { type: 'workspace.title', name: 'Current title' },
      },
    ],
    throughEventNumber: 12,
    hasMore: true,
    nextBeforeEventNumber: 7,
  }
  expect(readNewestStoredEvents(page)).toEqual({
    envelopes: [
      {
        workspaceId: 'workspace',
        eventNumber: 9,
        occurredAt: 25,
        event: { type: 'workspace.title', name: 'Current title' },
        late: false,
      },
    ],
    throughEventNumber: 12,
    nextBeforeEventNumber: 7,
  })
  expect(() => readStoredEvents(page)).toThrow(new UnreadableResponse('number'))
  expect(() =>
    readNewestStoredEvents({
      events: [],
      throughEventNumber: 12,
      hasMore: true,
      nextAfterEventNumber: 7,
    }),
  ).toThrow(new UnreadableResponse('number'))
  expect(readNewestStoredEvents({ events: [], throughEventNumber: 0 })).toEqual(
    {
      envelopes: [],
      throughEventNumber: 0,
      nextBeforeEventNumber: null,
    },
  )
})
