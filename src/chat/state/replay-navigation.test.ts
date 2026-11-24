import { expect, it, vi } from 'vitest'
import { sessionsPath, sessionPath, sessionPaths } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import { viewToWire } from '../../shared/workspace-view-wire'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  envelope,
  first,
  org,
  replayChat,
  saved,
  second,
  viewPath,
  ws,
} from './replay-test-kit'

it('keeps saved selection and tab order across socket history pages and a later save', async () => {
  const chat = replayChat()
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME)], 32)
  const during = chat.navigation()
  chat.page([envelope(33, null)])
  const after = chat.navigation()
  chat.controller.updateView((view) => ({ ...view, fileList: 'all' }))
  await vi.waitFor(
    () => expect(chat.requests('PUT', viewPath)).toHaveLength(1),
    { timeout: 10_000 },
  )
  const later: WorkspaceView = { ...saved, fileList: 'all' }
  expect.soft(during).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'autocomplete',
    view: saved,
  })
  expect.soft(after).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'autocomplete',
    view: saved,
  })
  expect.soft(await chat.bodies('PUT', viewPath)).toEqual([
    {
      ...viewToWire(later),
      skillTabs: [],
      activeSkill: null,
      temporarySkill: null,
    },
  ])
  expect.soft(await chat.savedView()).toEqual(later)
  chat.server.json('GET', sessionsPath(org, ws), {
    eventNumber: 40,
    sessions: [first, second],
    history: [],
  })
  await chat.controller.start()
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'autocomplete',
    view: later,
  })
})

it('keeps replay navigation through reconnect and publishes a close after an empty final page', async () => {
  const chat = replayChat()
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME)], 32)
  chat.listeners[0].closed()
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'autocomplete',
    view: saved,
  })
  chat.timers.runAll()
  expect(chat.after).toEqual([30, 32])
  chat.page([envelope(35, FAKE_TIME + 1)], 36)
  expect(chat.navigation().active).toBe('autocomplete')
  chat.page([])
  expect(chat.navigation()).toEqual({
    open: ['debounce'],
    active: 'debounce',
    view: {
      ...saved,
      tabs: [{ kind: 'session', sessionId: 'debounce' }],
      activeTab: { kind: 'session', sessionId: 'debounce' },
    },
  })
})

it('rolls back a failed user close during replay and keeps a later user selection', async () => {
  const close = sessionPaths.close(org, ws, first.id)
  const chat = replayChat({
    hold: (request) => request.method === 'POST' && request.url.endsWith(close),
  })
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME)], 32)
  chat.server.json('PATCH', sessionPath(org, ws, first.id), {
    session: { ...first, title: 'Updated title' },
    eventNumber: 30,
  })
  await chat.controller.rename(first.id, 'Updated title')
  expect(chat.navigation().active).toBe('autocomplete')
  chat.server.json('POST', close, { error: 'The server failed.' }, 503)
  const closing = chat.controller.requestClose(first.id)
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), { timeout: 10_000 })
  expect(chat.navigation().open).toEqual(['debounce'])
  await chat.controller.select(second.id)
  chat.held.splice(0, 1)[0]()
  await closing
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce'],
    active: 'debounce',
    view: { ...saved, activeTab: { kind: 'session', sessionId: 'debounce' } },
  })
  chat.page([envelope(33, null)])
  expect(chat.navigation().active).toBe('debounce')
  expect(chat.controller.getSnapshot().notice?.title).toBe(
    "The session didn't close",
  )
})

it('applies user closes and reopens immediately while replay keeps loading', async () => {
  const chat = replayChat()
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME)], 32)
  expect(chat.navigation().active).toBe('autocomplete')
  chat.server.json('POST', sessionPaths.close(org, ws, first.id), {
    session: { ...first, closedAt: FAKE_TIME + 2 },
    eventNumber: 41,
  })
  await chat.controller.requestClose(first.id)
  expect(chat.navigation().open).toEqual(['debounce'])
  chat.server.json('POST', sessionPaths.reopen(org, ws, first.id), {
    session: { ...first, title: 'Reopened by the user' },
    eventNumber: 42,
  })
  await chat.controller.reopen(first.id)
  expect(chat.navigation()).toEqual({
    open: ['debounce', 'autocomplete'],
    active: 'autocomplete',
    view: { ...saved, tabs: [saved.tabs[1], saved.tabs[0]] },
  })
  chat.page([envelope(33, null)])
  expect(chat.navigation().open).toEqual(['debounce', 'autocomplete'])
  expect(chat.controller.getSnapshot().sessions[1].title).toBe(
    'Reopened by the user',
  )
})
