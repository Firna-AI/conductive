import { describe, expect, it } from 'vitest'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { historySessions, tabSessions } from './archive-view'
import { chatFor, shown } from './test-kit'

/** An open session, whose stored `closedAt` is still null at the archive. */
const open = FAKE_IDS.session
/** A session that closed before the archive. */
const closed = 'postcode'

describe('the session history of an archived workspace', () => {
  it('opens, closes, and opens again the history of a session in the browser, with no write', async () => {
    const chat = chatFor({
      workspaceState: 'archived',
      conversation: 'history',
    })
    await chat.controller.start()
    const before = chat.controller.getSnapshot()
    const snapshot = () => chat.controller.getSnapshot()
    const tabs = () => tabSessions(snapshot()).map((session) => session.id)
    const history = () =>
      historySessions(snapshot()).map((session) => session.id)
    const writes = () =>
      chat.server.requests
        .filter((request) => request.method !== 'GET')
        .map((request) => `${request.method} ${new URL(request.url).pathname}`)

    await chat.controller.reopen(closed)
    expect(writes()).toEqual([])
    expect(snapshot().activeSessionId).toBe(closed)
    expect(tabs()).toEqual([open, 'debounce', closed])
    expect(chat.histories(closed)).toBe(1)
    expect(shown(chat.controller, closed)).toContain(
      'agent: The checkout form now suggests addresses. Manual entry still works.',
    )

    await chat.controller.requestClose(closed)
    await chat.controller.requestClose(open)
    expect(tabs()).toEqual(['debounce'])
    expect(snapshot().activeSessionId).toBe('debounce')
    expect(history()).toContain(closed)
    expect(history()).toContain(open)

    await chat.controller.reopen(open)
    await chat.controller.select('debounce')
    await chat.controller.reopen(closed)
    expect(tabs()).toEqual(['debounce', open, closed])
    expect(snapshot().activeSessionId).toBe(closed)
    expect(chat.histories(closed)).toBe(1)
    expect(writes()).toEqual([])
    expect(snapshot().sessions).toEqual(before.sessions)
    expect(snapshot().history).toEqual(before.history)
  })
})
