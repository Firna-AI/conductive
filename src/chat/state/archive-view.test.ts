import { describe, expect, it } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { workspaceViewPath } from '../../shared/workspace-view'
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

  it('ends the tabs of the browser at a Restore, shows an open session, and reads the saved view again', async () => {
    const chat = chatFor({
      workspaceState: 'archived',
      conversation: 'history',
    })
    await chat.controller.start()
    await chat.controller.reopen(closed)
    const snapshot = () => chat.controller.getSnapshot()
    const shownTabs = () => ({
      tabs: tabSessions(snapshot()).map((session) => session.id),
      active: snapshot().activeSessionId,
      views: chat.requests(
        'GET',
        workspaceViewPath(FAKE_IDS.org, FAKE_IDS.workspace),
      ).length,
    })
    const archived = shownTabs()
    const workspace = snapshot().workspace
    if (!workspace) throw new Error('The chat has no workspace.')
    chat.emit({
      type: 'workspace.updated',
      workspace: {
        ...workspace,
        state: 'stopped',
        archivedAt: null,
        restoreUntil: null,
        updatedAt: workspace.updatedAt + 1,
      },
    })
    await flushMicrotasks()
    expect({ archived, restored: shownTabs() }).toEqual({
      archived: { tabs: [open, 'debounce', closed], active: closed, views: 1 },
      restored: { tabs: [open, 'debounce'], active: open, views: 2 },
    })
  })
})
