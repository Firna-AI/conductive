import { describe, expect, it } from 'vitest'
import { sessionPaths } from '../../shared/sessions'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  leftSession,
  paneChat,
  rightFile,
  rightSession,
  setSplitView,
  splitView,
} from './pane-test-kit'
import { sessionTarget } from './pane-selection'
import { org, ws } from './tab-order-test-kit'

function closeChat(failing: boolean) {
  const chat = paneChat({
    hold: (request) =>
      request.method === 'POST' && request.url.endsWith('/close'),
    answer: async (request) =>
      failing && request.method === 'POST' && request.url.endsWith('/close')
        ? Response.json(
            { error: { code: 'unavailable', message: 'The close failed.' } },
            { status: 503 },
          )
        : null,
  })
  setSplitView(chat, {
    ...splitView,
    focusedPane: 1,
    panes: [
      { tabs: [leftSession], activeTab: leftSession, temporaryTab: null },
      splitView.panes[1],
    ],
  })
  return chat
}

describe('a session close that empties a pane', () => {
  it('keeps the remaining panes focus, shown session, and last session when the other pane closes', async () => {
    const chat = closeChat(false)
    await chat.controller.start()
    const first = chat.controller.getSnapshot().sessions[0]
    chat.server.json('POST', sessionPaths.close(org, ws, first.id), {
      session: { ...first, closedAt: FAKE_TIME },
      eventNumber: chat.nextEventNumber(),
    })
    const closing = chat.controller.requestClose(first.id)
    for (const release of chat.held.splice(0)) release()
    await closing
    expect(chat.controller.getSnapshot().view).toEqual({
      ...splitView,
      panes: [splitView.panes[1]],
    })
    chat.controller.updateView((view) => ({
      ...view,
      panes: [{ ...view.panes[0], activeTab: rightFile }],
    }))
    expect(chat.controller.getSnapshot().lastSessionIds).toEqual([
      'debounce',
      null,
    ])
    expect(sessionTarget(chat.controller.getSnapshot())).toBe('debounce')
    chat.controller.stop()
  })

  it('restores a failed close to its unfocused pane without taking focus from the other session', async () => {
    const chat = closeChat(true)
    await chat.controller.start()
    const closing = chat.controller.requestClose(leftSession.sessionId)
    expect(chat.controller.getSnapshot().view?.panes).toHaveLength(1)
    for (const release of chat.held.splice(0)) release()
    await closing
    const view = chat.controller.getSnapshot().view
    expect(view?.focusedPane).toBe(1)
    expect(view?.panes.map((pane) => pane.activeTab)).toEqual([
      leftSession,
      rightSession,
    ])
    expect(view?.panes[0].tabs).toEqual([leftSession])
    expect(view?.panes[1]).toEqual(splitView.panes[1])
    expect(chat.controller.getSnapshot().notice).toEqual({
      sessionId: leftSession.sessionId,
      title: "The session didn't close",
      message: 'The close failed.',
    })
    chat.controller.stop()
  })
})
