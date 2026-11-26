import { expect, it, vi } from 'vitest'
import { chatHistoryPath } from '../../shared/events'
import { sessionsPath } from '../../shared/sessions'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  envelope,
  first,
  org,
  replayChat,
  replayMessage,
  saved,
  second,
  ws,
} from './replay-test-kit'
import { shown } from './test-kit'

const initial = {
  open: ['autocomplete', 'debounce'],
  active: 'autocomplete',
  view: saved,
}
const firstClosed = {
  open: ['debounce'],
  active: 'debounce',
  view: {
    ...saved,
    tabs: [saved.tabs[1]],
    activeTab: { kind: 'session', sessionId: 'debounce' },
  },
}
const secondClosed = {
  open: ['autocomplete'],
  active: 'autocomplete',
  view: { ...saved, tabs: [saved.tabs[0]] },
}

it('places a close after selected history fails and keeps duplicate events once in order', async () => {
  const chat = replayChat()
  await chat.controller.start()
  const newest = replayMessage(38, 'Newest message', second)
  const closed = envelope(39, FAKE_TIME, second)
  chat.server.json('GET', chatHistoryPath(org, ws, second.id), {
    events: [newest, closed],
    throughEventNumber: 40,
    hasMore: true,
    nextBeforeEventNumber: 38,
  })
  chat.server.json(
    'GET',
    chatHistoryPath(org, ws, second.id, 38, 40),
    { error: 'The server failed.' },
    503,
  )
  await chat.controller.select(second.id)
  const failed = chat.navigation()
  expect(chat.controller.getSnapshot().sessionStates[second.id].hydration).toBe(
    'failed',
  )
  chat.page([replayMessage(35, 'Earlier message', second), newest, closed])
  const live = replayMessage(41, 'Live message', second)
  for (const event of [newest, closed, live, live]) {
    chat.listeners[0].message({ type: 'event', envelope: event })
  }
  expect(shown(chat.controller, second.id)).toEqual([
    'user: Earlier message',
    'user: Newest message',
    'user: Live message',
  ])
  expect(failed).toEqual(secondClosed)
  expect(chat.navigation()).toEqual(secondClosed)
  expect(chat.controller.getSnapshot().sessions).toEqual([first])
  expect(chat.controller.getSnapshot().history).toEqual([
    { ...second, closedAt: FAKE_TIME },
  ])
})

it('settles a failed history and Try again only after the overlapping socket replay ends', async () => {
  const chat = replayChat()
  await chat.controller.start()
  chat.page([], 30)
  const newest = replayMessage(38, 'Newest message', second)
  const closed = envelope(39, FAKE_TIME, second)
  const earlier = chatHistoryPath(org, ws, second.id, 38, 40)
  chat.server.json('GET', chatHistoryPath(org, ws, second.id), {
    events: [newest, closed],
    throughEventNumber: 40,
    hasMore: true,
    nextBeforeEventNumber: 38,
  })
  chat.server.json('GET', earlier, { error: 'The server failed.' }, 503)
  await chat.controller.select(second.id)
  const selected = {
    ...initial,
    active: 'debounce',
    view: { ...saved, activeTab: { kind: 'session', sessionId: 'debounce' } },
  }
  expect(chat.navigation()).toEqual(selected)
  expect(chat.controller.getSnapshot().sessionStates[second.id].hydration).toBe(
    'failed',
  )
  chat.server.json('GET', earlier, {
    events: [replayMessage(35, 'Earlier message', second), newest],
    throughEventNumber: 40,
  })
  expect(await chat.controller.loadHistory(second.id)).toBe(40)
  expect(chat.controller.getSnapshot().sessionStates[second.id].hydration).toBe(
    'ready',
  )
  expect(chat.navigation()).toEqual(selected)
  chat.page([newest, closed], 39)
  expect(chat.navigation()).toEqual(selected)
  chat.page([])
  expect(chat.navigation()).toEqual(secondClosed)
  expect(shown(chat.controller, second.id)).toEqual([
    'user: Earlier message',
    'user: Newest message',
  ])
  expect(chat.controller.getSnapshot().history).toEqual([
    { ...second, closedAt: FAKE_TIME },
  ])
})

it('holds completed first-load history until the later current session list sets navigation', async () => {
  const path = sessionsPath(org, ws)
  let reads = 0
  const chat = replayChat({
    hold: (request) =>
      request.method === 'GET' && request.url.endsWith(path) && ++reads === 2,
  })
  chat.server.json('GET', chatHistoryPath(org, ws, first.id), {
    events: [envelope(31, FAKE_TIME)],
    throughEventNumber: 35,
    hasMore: true,
    nextBeforeEventNumber: 31,
  })
  chat.server.json('GET', chatHistoryPath(org, ws, first.id, 31, 35), {
    events: [],
    throughEventNumber: 35,
  })
  const loading = chat.controller.start()
  await vi.waitFor(
    () => {
      expect(chat.held).toHaveLength(1)
      expect(
        chat.controller.getSnapshot().sessionStates[first.id].hydration,
      ).toBe('ready')
    },
    { timeout: 10_000 },
  )
  const during = chat.navigation()
  chat.server.json('GET', path, {
    eventNumber: 40,
    sessions: [first, second],
    history: [],
  })
  chat.held.splice(0, 1)[0]()
  await loading
  expect(during).toEqual(initial)
  expect(chat.navigation()).toEqual(initial)
  expect(chat.controller.getSnapshot().sessions).toEqual([first, second])
  expect(chat.controller.getSnapshot().history).toEqual([])
})

it('ends the first-load hold when its later session list fails', async () => {
  const path = sessionsPath(org, ws)
  let reads = 0
  const chat = replayChat({
    hold: (request) =>
      request.method === 'GET' && request.url.endsWith(path) && ++reads === 2,
  })
  chat.server.json('GET', chatHistoryPath(org, ws, first.id), {
    events: [envelope(31, FAKE_TIME)],
    throughEventNumber: 35,
  })
  const loading = chat.controller.start()
  await vi.waitFor(
    () => {
      expect(chat.held).toHaveLength(1)
      expect(
        chat.controller.getSnapshot().sessionStates[first.id].hydration,
      ).toBe('ready')
    },
    { timeout: 10_000 },
  )
  const during = chat.navigation()
  chat.server.json('GET', path, { error: 'The server failed.' }, 503)
  chat.held.splice(0, 1)[0]()
  await loading
  expect(during).toEqual(initial)
  expect(chat.navigation()).toEqual(firstClosed)
  expect(chat.controller.getSnapshot().load.state).toBe('failed')
  expect(chat.controller.getSnapshot().sessions).toEqual([second])
  expect(chat.controller.getSnapshot().history).toEqual([
    { ...first, closedAt: FAKE_TIME },
  ])
})
