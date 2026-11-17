import { describe, expect, it } from 'vitest'
import { sessionPaths, sessionsPath } from '../../shared/sessions'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  paneChat,
  leftFile,
  leftSession,
  rightFile,
  rightSession,
  showFiles,
  splitView,
} from './pane-test-kit'
import { sessionTarget } from './pane-selection'
import { choice, org, ws } from './tab-order-test-kit'
import { newSessionRecord } from './test-kit'

describe('session actions across panes', () => {
  it('sends prompts to the other shown session and remembers each rows last session behind files', async () => {
    const chat = paneChat()
    await chat.controller.start()
    const last = newSessionRecord('left-last', choice)
    chat.emit({ type: 'session.updated', session: last })
    await chat.controller.select(last.id)
    await chat.controller.select(rightSession.sessionId)
    chat.controller.updateView((view) => ({
      ...view,
      focusedPane: 0,
      panes: [
        { ...view.panes[0], activeTab: leftFile },
        view.panes[1] ?? splitView.panes[1],
      ],
    }))
    await chat.controller.sendPrompt('Check the right session')
    expect(
      chat.requests(
        'POST',
        sessionPaths.messages(org, ws, rightSession.sessionId),
      ),
    ).toHaveLength(1)
    showFiles(chat)
    expect(sessionTarget(chat.controller.getSnapshot())).toBe('left-last')
    await chat.controller.sendPrompt('Check the left session')
    expect(
      chat.requests('POST', sessionPaths.messages(org, ws, last.id)),
    ).toHaveLength(1)
    chat.controller.updateView((view) => ({ ...view, focusedPane: 1 }))
    expect(sessionTarget(chat.controller.getSnapshot())).toBe('debounce')
    expect(chat.controller.getSnapshot().lastSessionIds).toEqual([
      'left-last',
      'debounce',
    ])
    expect(
      chat.controller.getSnapshot().view?.panes.map((pane) => pane.activeTab),
    ).toEqual([leftFile, rightFile])
    chat.controller.updateView((view) => ({
      ...view,
      panes: [
        { ...view.panes[0], tabs: [leftFile], activeTab: leftFile },
        { tabs: [rightFile], activeTab: rightFile, temporaryTab: null },
      ],
    }))
    expect(await chat.controller.sendPrompt('There is no session tab')).toBe(
      'unavailable',
    )
    expect(
      chat.requests(
        'POST',
        sessionPaths.messages(org, ws, rightSession.sessionId),
      ),
    ).toHaveLength(1)
    chat.controller.stop()
  })

  it('opens New session and history in the focused row and plus in the specified row', async () => {
    const chat = paneChat({
      hold: (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === sessionsPath(org, ws),
    })
    await chat.controller.start()
    chat.controller.updateView((view) => ({ ...view, focusedPane: 1 }))
    const create = async (id: string, pane?: 0 | 1) => {
      chat.server.json(
        'POST',
        sessionsPath(org, ws),
        {
          session: newSessionRecord(id, choice),
          eventNumber: chat.nextEventNumber(),
        },
        201,
      )
      const opening = chat.controller.newSession(pane)
      chat.controller.updateView((view) => ({
        ...view,
        focusedPane: view.focusedPane === 0 ? 1 : 0,
      }))
      for (const release of chat.held.splice(0)) release()
      await opening
    }
    await create('new-right')
    expect(chat.controller.getSnapshot().view?.panes[1]?.activeTab).toEqual({
      kind: 'session',
      sessionId: 'new-right',
    })
    await create('plus-left', 0)
    const closed = chat.controller.getSnapshot().history[0]
    chat.server.json('POST', sessionPaths.reopen(org, ws, closed.id), {
      session: { ...closed, closedAt: null },
      eventNumber: chat.nextEventNumber(),
    })
    await chat.controller.reopen(closed.id)
    const view = chat.controller.getSnapshot().view
    expect(view?.focusedPane).toBe(0)
    expect(view?.panes[0].tabs).toEqual([
      leftSession,
      leftFile,
      { kind: 'session', sessionId: 'plus-left' },
      { kind: 'session', sessionId: closed.id },
    ])
    expect(view?.panes[1]?.tabs).toEqual([
      rightSession,
      rightFile,
      { kind: 'session', sessionId: 'new-right' },
    ])
    expect(view?.panes[1]?.activeTab).toEqual({
      kind: 'session',
      sessionId: 'new-right',
    })
    chat.controller.stop()
  })

  it('closes an unfocused session within its own row and loads its next tab without changing the focused session', async () => {
    const chat = paneChat()
    await chat.controller.start()
    const next = newSessionRecord('left-next', choice)
    chat.emit({ type: 'session.updated', session: next })
    chat.controller.updateView((view) => ({
      ...view,
      focusedPane: 1,
      panes: [
        {
          ...view.panes[0],
          tabs: [
            leftSession,
            { kind: 'session', sessionId: next.id },
            leftFile,
          ],
        },
        view.panes[1] ?? splitView.panes[1],
      ],
    }))
    const first = chat.controller
      .getSnapshot()
      .sessions.find((item) => item.id === FAKE_IDS.session)
    if (!first) throw new Error('The left session did not load.')
    chat.server.json('POST', sessionPaths.close(org, ws, first.id), {
      session: { ...first, closedAt: FAKE_TIME },
      eventNumber: chat.nextEventNumber(),
    })
    await chat.controller.requestClose(first.id)
    const view = chat.controller.getSnapshot().view
    expect(view?.focusedPane).toBe(1)
    expect(view?.panes.map((pane) => pane.activeTab)).toEqual([
      { kind: 'session', sessionId: next.id },
      rightSession,
    ])
    expect(chat.histories(next.id)).toBe(1)
    expect(chat.controller.getSnapshot().lastSessionIds).toEqual([
      'left-next',
      'debounce',
    ])
    chat.controller.stop()
  })
})
