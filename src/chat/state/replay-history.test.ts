import { expect, it, vi } from 'vitest'
import { chatHistoryPath } from '../../shared/events'
import { sessionsPath, sessionPaths } from '../../shared/sessions'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  envelope,
  first,
  org,
  replayChat,
  saved,
  second,
  ws,
} from './replay-test-kit'
import { newSessionRecord } from './test-kit'

it('shows newer fields and sends the shown model while selected history and socket replay overlap', async () => {
  const earlier = chatHistoryPath(org, ws, second.id, 39, 40)
  const chat = replayChat({
    hold: (request) =>
      request.method === 'GET' && request.url.endsWith(earlier),
  })
  await chat.controller.start()
  chat.page([envelope(31, 1)], 32)
  expect(chat.navigation().active).toBe('autocomplete')
  const newest = {
    ...second,
    title: 'Current history title',
    choice: { ...second.choice, model: 'Sonnet 5.5' },
  }
  chat.server.json('GET', chatHistoryPath(org, ws, second.id), {
    events: [envelope(39, null, newest)],
    throughEventNumber: 40,
    hasMore: true,
    nextBeforeEventNumber: 39,
  })
  chat.server.json('GET', earlier, {
    events: [envelope(35, null, second)],
    throughEventNumber: 40,
  })
  const selecting = chat.controller.select(second.id)
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), { timeout: 10_000 })
  const snapshot = chat.controller.getSnapshot()
  expect(snapshot.sessions[1]).toEqual(newest)
  expect(snapshot.sessionStates[second.id].hydration).toBe('loading')
  expect(snapshot.activeSessionId).toBe('debounce')
  chat.controller.setDraft(second.id, 'Use the model that the composer shows.')
  await chat.controller.send(second.id)
  expect(
    await chat.bodies('POST', sessionPaths.messages(org, ws, second.id)),
  ).toEqual([
    {
      id: 'client-1',
      text: 'Use the model that the composer shows.',
      attachmentIds: [],
      choice: newest.choice,
    },
  ])
  chat.page([envelope(33, null)])
  expect(chat.navigation().open).toEqual(['autocomplete', 'debounce'])
  chat.held.splice(0, 1)[0]()
  await selecting
  expect(chat.controller.getSnapshot().sessions[1]).toEqual(newest)
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'debounce',
    view: { ...saved, activeTab: { kind: 'session', sessionId: 'debounce' } },
  })
})

it('lets the later current list set navigation when the first history fails after a partial close', async () => {
  let lists = 0
  const path = sessionsPath(org, ws)
  const earlier = chatHistoryPath(org, ws, first.id, 31, 35)
  const chat = replayChat({
    hold: (request) =>
      request.method === 'GET' && request.url.endsWith(earlier),
    answer: async (request) => {
      if (request.method !== 'GET' || !request.url.endsWith(path)) return null
      lists += 1
      return Response.json({
        eventNumber: lists === 1 ? 30 : 40,
        sessions: [first, second],
        history: [],
      })
    },
  })
  chat.server.json('GET', chatHistoryPath(org, ws, first.id), {
    events: [envelope(31, 1)],
    throughEventNumber: 35,
    hasMore: true,
    nextBeforeEventNumber: 31,
  })
  chat.server.json('GET', earlier, { error: 'The server failed.' }, 503)
  await chat.controller.start()
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), { timeout: 10_000 })
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'autocomplete',
    view: saved,
  })
  const complete = chat.controller.loadHistory(first.id)
  chat.held.splice(0, 1)[0]()
  expect(await complete).toBeNull()
  expect(lists).toBe(2)
  expect(chat.controller.getSnapshot().sessionStates[first.id].hydration).toBe(
    'failed',
  )
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'autocomplete',
    view: saved,
  })
})

it('moves a draft once when its new model session first arrives in a replay page', async () => {
  const modelPath = sessionPaths.model(org, ws, first.id)
  const chat = replayChat({
    hold: (request) =>
      request.method === 'PUT' && request.url.endsWith(modelPath),
  })
  chat.server.json('GET', chatHistoryPath(org, ws, first.id), {
    events: [
      {
        workspaceId: ws,
        eventNumber: 29,
        occurredAt: FAKE_TIME,
        event: {
          type: 'message.accepted',
          message: workspaceFixtures().message,
        },
      },
    ],
    throughEventNumber: 30,
  })
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME)], 31)
  expect(chat.navigation().active).toBe('autocomplete')
  chat.controller.setDraft(first.id, 'Move this draft once.')
  const target = newSessionRecord('client-1', {
    agent: 'codex',
    model: 'GPT-6.1 Sol',
    effort: 'medium',
    fast: false,
  })
  const choosing = chat.controller.chooseModel(first.id, target.choice)
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), { timeout: 10_000 })
  chat.page([envelope(32, null, target)], 32)
  expect(chat.navigation().active).toBe('client-1')
  expect(chat.navigation().open).toEqual([
    'autocomplete',
    'debounce',
    'client-1',
  ])
  expect(chat.draftOf('client-1')?.text).toBe('Move this draft once.')
  chat.controller.setDraft('client-1', 'More text after the move.')
  chat.server.json('PUT', modelPath, {
    session: target,
    eventNumber: 42,
    created: true,
    draft: { text: 'Move this draft once.', attachmentIds: [] },
  })
  chat.held.splice(0, 1)[0]()
  await choosing
  chat.page([envelope(33, null)])
  expect(chat.navigation().active).toBe('client-1')
  expect(chat.draftOf('client-1')?.text).toBe('More text after the move.')
  expect(chat.draftOf(first.id)?.text).toBe('')
})

it('keeps local read-only tabs through replay and never reopens a tab closed locally', async () => {
  const closed = newSessionRecord('postcode', first.choice, FAKE_TIME)
  const chat = replayChat({ readOnly: () => true })
  chat.server.json('GET', sessionsPath(org, ws), {
    eventNumber: 30,
    sessions: [first, second],
    history: [closed],
  })
  await chat.controller.start()
  await chat.controller.reopen(closed.id)
  chat.page([envelope(31, FAKE_TIME), envelope(32, FAKE_TIME + 1, closed)], 32)
  expect(chat.navigation().active).toBe('postcode')
  await chat.controller.requestClose(first.id)
  chat.page([envelope(33, null)])
  expect(chat.row()).toEqual([
    { kind: 'session', sessionId: 'debounce' },
    { kind: 'session', sessionId: 'postcode' },
  ])
  expect(chat.navigation().active).toBe('postcode')
  expect(chat.writes()).toEqual([])
})
