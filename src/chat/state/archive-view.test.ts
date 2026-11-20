import { describe, expect, it } from 'vitest'
import { flushMicrotasks } from '../../app/test-kit'
import { workspaceViewPath } from '../../shared/workspace-view'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { chatHistory } from '../components/ChatOverlays'
import { historySessions, tabSessions } from './archive-view'
import type { ChatSnapshot } from './chat-snapshot'
import { chatFor, shown } from './test-kit'

/** An open session, whose stored `closedAt` is still null at the archive. */
const open = FAKE_IDS.session
/** A session that closed before the archive. */
const closed = 'postcode'

/**
 * The IDs of the session history in the order of its menu, whose first row
 * Reopen closed session runs. `readOnly` is what the chat shows.
 */
function historyOrder(snapshot: ChatSnapshot, readOnly = true): string[] {
  return chatHistory(snapshot, readOnly, FAKE_TIME, () => {}).flatMap(
    (entry) => (entry.kind === 'item' ? [entry.key] : []),
  )
}

/** Restores the archived workspace of the chat, as the stream says. */
async function restore(chat: ReturnType<typeof chatFor>): Promise<void> {
  const workspace = chat.controller.getSnapshot().workspace
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
}

describe('the session history of an archived workspace', () => {
  it('opens, closes, and opens again the history of a session in the browser, with no write, and lists the last closed first', async () => {
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
    const firstCloses = historyOrder(snapshot())

    await chat.controller.reopen(open)
    await chat.controller.select('debounce')
    await chat.controller.reopen(closed)
    expect(tabs()).toEqual(['debounce', open, closed])
    expect(snapshot().activeSessionId).toBe(closed)
    expect(chat.histories(closed)).toBe(1)
    expect(writes()).toEqual([])
    expect(snapshot().sessions).toEqual(before.sessions)
    expect(snapshot().history).toEqual(before.history)

    // Both open sessions end at the archive, so only the order of their
    // closes in the browser tells which one closed last.
    await chat.controller.requestClose(open)
    await chat.controller.requestClose('debounce')
    expect({ firstCloses, lastCloses: historyOrder(snapshot()) }).toEqual({
      firstCloses: [open, closed, 'proxy-timeouts', 'field-order', 'untitled'],
      lastCloses: [
        'debounce',
        open,
        'proxy-timeouts',
        'field-order',
        'untitled',
      ],
    })
  })

  it('lists a session whose tab closed in the browser first only while the chat is read-only, and forgets that close at a Restore', async () => {
    let suspended = false
    const chat = chatFor({
      workspaceState: 'archived',
      conversation: 'history',
      readOnly: () => suspended,
    })
    await chat.controller.start()
    const snapshot = () => chat.controller.getSnapshot()
    const reclose = async () => {
      await chat.controller.reopen(closed)
      await chat.controller.requestClose(closed)
    }

    await reclose()
    const archived = historyOrder(snapshot())
    await restore(chat)
    const restored = historyOrder(snapshot(), false)
    suspended = true
    const suspendedAfterRestore = historyOrder(snapshot())
    await reclose()
    const suspendedReclosed = historyOrder(snapshot())
    suspended = false
    const writable = historyOrder(snapshot(), false)

    const stored = ['proxy-timeouts', closed, 'field-order', 'untitled']
    const reclosed = [closed, 'proxy-timeouts', 'field-order', 'untitled']
    expect({
      archived,
      restored,
      suspendedAfterRestore,
      suspendedReclosed,
      writable,
    }).toEqual({
      archived: reclosed,
      restored: stored,
      suspendedAfterRestore: stored,
      suspendedReclosed: reclosed,
      writable: stored,
    })
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
    await restore(chat)
    expect({ archived, restored: shownTabs() }).toEqual({
      archived: { tabs: [open, 'debounce', closed], active: closed, views: 1 },
      restored: { tabs: [open, 'debounce'], active: open, views: 2 },
    })
  })
})
