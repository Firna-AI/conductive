import { describe, expect, it, vi } from 'vitest'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { chatFor } from './test-kit'
import { sessionTarget } from './pane-selection'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const id = FAKE_IDS.session
const shortly = { timeout: 10_000 }
const isClose = (request: Request) =>
  request.method === 'POST' && request.url.endsWith('/close')

/** The open sessions, the shown session, and the session tabs of the view. */
function tabsOf(chat: ReturnType<typeof chatFor>) {
  const snapshot = chat.controller.getSnapshot()
  return {
    open: snapshot.sessions.map((session) => session.id),
    shown: sessionTarget(snapshot),
    tabs: (snapshot.view?.panes[0].tabs ?? []).flatMap((tab) =>
      tab.kind === 'session' ? [tab.sessionId] : [],
    ),
    closed: snapshot.history.map((session) => session.id),
  }
}

describe('closing a session tab', () => {
  it('moves the tab to the history at once, and keeps it there when an open record from the stream arrives before the reply', async () => {
    const chat = chatFor({ conversation: 'history', hold: isClose })
    await chat.controller.start()
    const [session] = chat.controller.getSnapshot().sessions
    expect(tabsOf(chat)).toMatchObject({ open: [id, 'debounce'], shown: id })
    chat.server.json('POST', sessionPaths.close(org, ws, id), {
      session: { ...session, closedAt: FAKE_TIME + 1 },
      eventNumber: chat.nextEventNumber() + 1,
    })
    const closing = chat.controller.requestClose(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    expect(tabsOf(chat)).toMatchObject({
      open: ['debounce'],
      shown: 'debounce',
      tabs: ['debounce'],
    })
    expect(tabsOf(chat).closed).toContain(id)
    chat.emit({ type: 'session.updated', session })
    expect(tabsOf(chat).open).toEqual(['debounce'])
    chat.held.splice(0, 1)[0]()
    await closing
    expect(tabsOf(chat).open).toEqual(['debounce'])
    expect(chat.controller.getSnapshot().history[0]).toMatchObject({
      id,
      closedAt: FAKE_TIME + 1,
    })
  })

  it('puts the tab back in its place and shows it again when the close fails', async () => {
    const chat = chatFor({
      conversation: 'history',
      hold: isClose,
      answer: async (request) =>
        isClose(request)
          ? Response.json({ error: 'The server failed.' }, { status: 503 })
          : null,
    })
    await chat.controller.start()
    const closing = chat.controller.requestClose(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    expect(tabsOf(chat).open).toEqual(['debounce'])
    chat.held.splice(0, 1)[0]()
    await closing
    expect(tabsOf(chat)).toMatchObject({
      open: [id, 'debounce'],
      shown: id,
      tabs: [id, 'debounce'],
    })
    expect(tabsOf(chat).closed).not.toContain(id)
    expect(chat.controller.getSnapshot().notice).toMatchObject({
      sessionId: id,
      title: "The session didn't close",
    })
  })

  it('keeps the tab that the user chose during a failed close, and shows the notice there', async () => {
    const chat = chatFor({
      conversation: 'history',
      hold: isClose,
      answer: async (request) =>
        isClose(request)
          ? Response.json({ error: 'The server failed.' }, { status: 503 })
          : null,
    })
    await chat.controller.start()
    const closing = chat.controller.requestClose(id)
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    await chat.controller.select('debounce')
    chat.held.splice(0, 1)[0]()
    await closing
    expect(tabsOf(chat)).toMatchObject({
      open: [id, 'debounce'],
      shown: 'debounce',
      tabs: [id, 'debounce'],
    })
    expect(chat.controller.getSnapshot().notice).toMatchObject({
      sessionId: null,
      title: "The session didn't close",
    })
  })
})
