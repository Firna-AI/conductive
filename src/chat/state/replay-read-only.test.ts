import { expect, it, vi } from 'vitest'
import type { WorkspaceEventEnvelope } from '../../shared/events'
import { sessionsPath } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { historySessions } from './archive-view'
import {
  envelope,
  first,
  org,
  replayChat,
  replayMessage,
  saved,
  second,
  viewPath,
  ws,
} from './replay-test-kit'
import { newSessionRecord, shown } from './test-kit'

type ReplayChat = ReturnType<typeof replayChat>
const secondView: WorkspaceView = {
  ...saved,
  tabs: [saved.tabs[1]],
  activeTab: { kind: 'session', sessionId: second.id },
}

function workspaceEvent(
  chat: ReplayChat,
  eventNumber: number,
  archived: boolean,
): WorkspaceEventEnvelope {
  const workspace = chat.controller.getSnapshot().workspace
  if (!workspace) throw new Error('The chat has no workspace.')
  return {
    workspaceId: ws,
    eventNumber,
    occurredAt: FAKE_TIME + eventNumber,
    event: {
      type: 'workspace.updated',
      workspace: {
        ...workspace,
        state: archived ? 'archived' : 'stopped',
        archivedAt: archived ? FAKE_TIME : null,
        restoreUntil: archived ? FAKE_TIME + 1000 : null,
        updatedAt: FAKE_TIME + eventNumber,
      },
    },
  }
}

async function restore(
  chat: ReplayChat,
  view: WorkspaceView,
  eventNumber = 41,
) {
  chat.server.json('GET', viewPath, { view })
  chat.listeners.at(-1)?.message({
    type: 'event',
    envelope: workspaceEvent(chat, eventNumber, false),
  })
  await vi.waitFor(
    () => {
      expect(chat.controller.getSnapshot().archiveTabs).toBeNull()
      expect(chat.controller.getSnapshot().view).toEqual(view)
    },
    { timeout: 10_000 },
  )
}

it('updates stored membership after Archive and replay while local close and reopen keep their navigation until Restore', async () => {
  const chat = replayChat()
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME), workspaceEvent(chat, 32, true)], 32)
  await chat.controller.requestClose(second.id)
  await chat.controller.reopen(second.id)
  await chat.controller.requestClose(second.id)
  const local = {
    tabs: [saved.tabs[0]],
    active: first.id,
    view: { ...saved, tabs: [saved.tabs[0]] },
  }
  expect({
    tabs: chat.row(),
    active: chat.navigation().active,
    view: chat.navigation().view,
  }).toEqual(local)
  chat.page([])
  const snapshot = chat.controller.getSnapshot()
  expect({
    tabs: chat.row(),
    active: snapshot.activeSessionId,
    view: snapshot.view,
  }).toEqual(local)
  expect(snapshot.sessions).toEqual([second])
  expect(snapshot.history).toEqual([{ ...first, closedAt: FAKE_TIME }])
  expect(historySessions(snapshot, true).map((session) => session.id)).toEqual([
    'debounce',
  ])
  expect(chat.writes()).toEqual([])
  await restore(chat, secondView)
  expect(chat.navigation()).toEqual({
    open: ['debounce'],
    active: 'debounce',
    view: secondView,
  })
  expect(chat.row()).toEqual([saved.tabs[1]])
})

it('keeps a new replayed session in stored read-only history without changing the local choice or view', async () => {
  const created = newSessionRecord('created', first.choice)
  const chat = replayChat()
  await chat.controller.start()
  const message = replayMessage(33, 'Created session message', created)
  chat.page(
    [envelope(31, null, created), workspaceEvent(chat, 32, true), message],
    33,
  )
  await chat.controller.select(second.id)
  chat.page([message])
  const snapshot = chat.controller.getSnapshot()
  expect(chat.row()).toEqual(saved.tabs)
  expect(snapshot.activeSessionId).toBe('debounce')
  expect(snapshot.view).toEqual(saved)
  expect(snapshot.sessions).toEqual([first, second, created])
  expect(snapshot.history).toEqual([])
  expect(historySessions(snapshot, true).map((session) => session.id)).toEqual([
    'created',
  ])
  expect(shown(chat.controller, created.id)).toEqual([
    'user: Created session message',
  ])
  expect(chat.writes()).toEqual([])
  const restored: WorkspaceView = {
    ...saved,
    tabs: [...saved.tabs, { kind: 'session', sessionId: created.id }],
    activeTab: { kind: 'session', sessionId: second.id },
  }
  await restore(chat, restored)
  expect(chat.navigation()).toEqual({
    open: ['autocomplete', 'debounce', 'created'],
    active: 'debounce',
    view: restored,
  })
  expect(chat.row()).toEqual(restored.tabs)
})

it('moves a replayed reopen into stored open sessions while keeping local tabs and selection through Restore', async () => {
  const chat = replayChat()
  const closed = { ...first, closedAt: FAKE_TIME - 1 }
  chat.server.json('GET', sessionsPath(org, ws), {
    eventNumber: 30,
    sessions: [second],
    history: [closed],
  })
  chat.server.json('GET', viewPath, { view: secondView })
  await chat.controller.start()
  chat.page([envelope(31, null), workspaceEvent(chat, 32, true)], 32)
  await chat.controller.select(second.id)
  chat.page([])
  const snapshot = chat.controller.getSnapshot()
  expect(chat.row()).toEqual([saved.tabs[1]])
  expect(snapshot.activeSessionId).toBe('debounce')
  expect(snapshot.view).toEqual(secondView)
  expect(snapshot.sessions).toEqual([second, first])
  expect(snapshot.history).toEqual([])
  expect(historySessions(snapshot, true).map((session) => session.id)).toEqual([
    'autocomplete',
  ])
  expect(chat.writes()).toEqual([])
  const restored: WorkspaceView = {
    ...secondView,
    tabs: [saved.tabs[1], saved.tabs[0]],
  }
  await restore(chat, restored)
  expect(chat.navigation()).toEqual({
    open: ['debounce', 'autocomplete'],
    active: 'debounce',
    view: restored,
  })
  expect(chat.row()).toEqual(restored.tabs)
})

it('updates stored membership during replay when a suspended read-only chat already has local tabs', async () => {
  let suspended = true
  const chat = replayChat({ readOnly: () => suspended })
  await chat.controller.start()
  await chat.controller.select(second.id)
  const message = replayMessage(33, 'Message during suspension')
  chat.page(
    [envelope(31, FAKE_TIME), workspaceEvent(chat, 32, true), message],
    33,
  )
  const during = chat.controller.getSnapshot()
  chat.page([message])
  const snapshot = chat.controller.getSnapshot()
  expect(during.sessions).toEqual([second])
  expect(during.history).toEqual([{ ...first, closedAt: FAKE_TIME }])
  expect(snapshot.sessions).toEqual([second])
  expect(snapshot.history).toEqual([{ ...first, closedAt: FAKE_TIME }])
  expect(chat.row()).toEqual(saved.tabs)
  expect(snapshot.activeSessionId).toBe('debounce')
  expect(snapshot.view).toEqual(saved)
  expect(shown(chat.controller, first.id)).toEqual([
    'user: Message during suspension',
  ])
  const current = { ...first, title: 'Current title', closedAt: FAKE_TIME + 1 }
  const live = envelope(41, FAKE_TIME + 1, current)
  for (const event of [live, live]) {
    chat.listeners[0].message({ type: 'event', envelope: event })
  }
  expect(chat.controller.getSnapshot().history).toEqual([current])
  expect(chat.row()).toEqual(saved.tabs)
  expect(chat.navigation().active).toBe('debounce')
  expect(chat.navigation().view).toEqual(saved)
  expect(shown(chat.controller, first.id)).toEqual([
    'user: Message during suspension',
  ])
  expect(chat.writes()).toEqual([])
  suspended = false
  await restore(chat, secondView, 42)
  expect(chat.navigation()).toEqual({
    open: ['debounce'],
    active: 'debounce',
    view: secondView,
  })
  expect(chat.row()).toEqual([saved.tabs[1]])
})

it('keeps the replay hold through reconnect and settles stored membership after a local choice and an empty final page', async () => {
  const chat = replayChat()
  await chat.controller.start()
  chat.page([envelope(31, FAKE_TIME), workspaceEvent(chat, 32, true)], 32)
  chat.listeners[0].closed()
  await chat.controller.select(second.id)
  chat.timers.runAll()
  expect(chat.after).toEqual([30, 32])
  expect(chat.row()).toEqual(saved.tabs)
  expect(chat.navigation().active).toBe('debounce')
  chat.page([])
  const snapshot = chat.controller.getSnapshot()
  expect(snapshot.sessions).toEqual([second])
  expect(snapshot.history).toEqual([{ ...first, closedAt: FAKE_TIME }])
  expect(chat.row()).toEqual(saved.tabs)
  expect(snapshot.activeSessionId).toBe('debounce')
  expect(snapshot.view).toEqual(saved)
  expect(chat.writes()).toEqual([])
  await restore(chat, secondView)
  expect(chat.navigation()).toEqual({
    open: ['debounce'],
    active: 'debounce',
    view: secondView,
  })
  expect(chat.row()).toEqual([saved.tabs[1]])
})
