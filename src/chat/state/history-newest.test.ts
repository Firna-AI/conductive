import { expect, it, vi } from 'vitest'
import {
  chatHistoryPath,
  type WorkspaceEventEnvelope,
} from '../../shared/events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { chatFor, shown } from './test-kit'

const { org, workspace: ws, session } = FAKE_IDS
const shortly = { timeout: 10_000 }

function message(eventNumber: number, text: string): WorkspaceEventEnvelope {
  return {
    workspaceId: ws,
    eventNumber,
    occurredAt: FAKE_TIME + eventNumber,
    event: {
      type: 'message.accepted',
      message: {
        ...workspaceFixtures().message,
        id: `message-${eventNumber}`,
        text,
      },
    },
  }
}

function pagedChat(holdBefore: number) {
  const chat = chatFor({
    hold: (request) =>
      new URL(request.url).searchParams.get('before') === String(holdBefore),
  })
  const path = (beforeEventNumber?: number) =>
    chatHistoryPath(
      org,
      ws,
      session,
      { order: 'newest', beforeEventNumber },
      beforeEventNumber === undefined ? undefined : 20,
    )
  chat.server.json('GET', path(), {
    events: [message(20, 'Newest message')],
    throughEventNumber: 20,
    hasMore: true,
    nextBeforeEventNumber: 20,
  })
  chat.server.json('GET', path(20), {
    events: [message(10, 'Middle message')],
    throughEventNumber: 20,
    hasMore: true,
    nextBeforeEventNumber: 10,
  })
  chat.server.json('GET', path(10), {
    events: [message(1, 'Oldest message')],
    throughEventNumber: 20,
  })
  return chat
}

it('merges earlier history and concurrent live events once each in event order', async () => {
  const chat = pagedChat(10)
  await chat.controller.start()
  expect(shown(chat.controller, session)).toEqual(['user: Newest message'])
  expect(chat.after).toEqual([20])
  const complete = chat.controller.loadHistory(session)
  let completed = false
  void complete.then(() => {
    completed = true
  })
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
  chat.server.events.emit(message(21, 'Live message'))
  chat.server.events.emit(message(21, 'Live message'))
  expect(shown(chat.controller, session)).toEqual([
    'user: Newest message',
    'user: Live message',
  ])
  expect(completed).toBe(false)
  expect(chat.histories(session)).toBe(2)
  chat.held.splice(0, 1)[0]()
  await complete
  expect(completed).toBe(true)
  expect(shown(chat.controller, session)).toEqual([
    'user: Oldest message',
    'user: Middle message',
    'user: Newest message',
    'user: Live message',
  ])
  expect(chat.controller.getSnapshot().sessionStates[session].hydration).toBe(
    'ready',
  )
})

it('holds earlier pages until the oldest page and publishes them together', async () => {
  const chat = pagedChat(10)
  await chat.controller.start()
  expect(shown(chat.controller, session)).toEqual(['user: Newest message'])
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
  expect(shown(chat.controller, session)).toEqual(['user: Newest message'])
  const complete = chat.controller.loadHistory(session)
  chat.held.splice(0, 1)[0]()
  await complete
  expect(shown(chat.controller, session)).toEqual([
    'user: Oldest message',
    'user: Middle message',
    'user: Newest message',
  ])
})

it('stops earlier reads and ignores their late replies when the chat stops', async () => {
  const chat = pagedChat(20)
  await chat.controller.start()
  expect(shown(chat.controller, session)).toEqual(['user: Newest message'])
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
  const complete = chat.controller.loadHistory(session)
  const before = chat.controller.getSnapshot()
  chat.controller.stop()
  chat.held.splice(0, 1)[0]()
  expect(await complete).toBeNull()
  expect(chat.controller.getSnapshot()).toBe(before)
  expect(chat.histories(session)).toBe(2)

  const immediate = pagedChat(20)
  const unwatch = immediate.controller.subscribe(() => {
    if (shown(immediate.controller, session).includes('user: Newest message'))
      immediate.controller.stop()
  })
  await immediate.controller.start()
  unwatch()
  expect(immediate.held).toEqual([])
  expect(immediate.histories(session)).toBe(1)
  expect(immediate.after).toEqual([])
})
