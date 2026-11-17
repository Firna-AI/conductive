import { describe, expect, it } from 'vitest'
import { record, text } from '../api/json'
import { acceptedIn, LINKED, linkedRecord } from './linked-kit'
import {
  codex,
  leftFile,
  leftSession,
  paneChat,
  rightFile,
  rightSession,
  setSplitView,
  splitView,
} from './pane-test-kit'
import { sessionTarget } from './pane-selection'
import { newSessionRecord, opensSession } from './test-kit'
import { choice } from './tab-order-test-kit'

describe('the pane of an arriving session', () => {
  it('appends another members session in the focused row without changing either shown tab', async () => {
    const chat = paneChat()
    await chat.controller.start()
    chat.controller.updateView((view) => ({ ...view, focusedPane: 1 }))
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord('remote', choice),
    })
    expect(chat.controller.getSnapshot().view).toEqual({
      ...splitView,
      focusedPane: 1,
      panes: [
        splitView.panes[0],
        {
          ...splitView.panes[1],
          tabs: [
            rightSession,
            rightFile,
            { kind: 'session', sessionId: 'remote' },
          ],
        },
      ],
    })
    expect(chat.histories('remote')).toBe(0)
    chat.controller.stop()
  })

  it('opens a model changes session beside its unfocused source and moves its draft once when the stream comes first', async () => {
    const chat = paneChat({
      answer: opensSession(codex),
      hold: (request) =>
        request.method === 'PUT' && request.url.endsWith('/model'),
    })
    setSplitView(chat, {
      ...splitView,
      panes: [
        { ...splitView.panes[0], activeTab: leftFile },
        splitView.panes[1],
      ],
    })
    await chat.controller.start()
    chat.controller.setDraft('debounce', 'Continue on the other agent')
    const draft = chat.draftOf('debounce')?.id
    const picking = chat.controller.chooseModel(
      sessionTarget(chat.controller.getSnapshot()) ?? '',
      codex,
    )
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord('client-1', codex),
    })
    expect(
      chat.controller.getSnapshot().view?.panes.map((pane) => pane.activeTab),
    ).toEqual([leftFile, { kind: 'session', sessionId: 'client-1' }])
    expect(chat.draftOf('client-1')).toMatchObject({
      id: draft,
      text: 'Continue on the other agent',
    })
    chat.controller.setDraft('client-1', 'Text after the stream')
    for (const release of chat.held.splice(0)) release()
    await picking
    expect(chat.draftOf('client-1')?.text).toBe('Text after the stream')
    expect(chat.controller.getSnapshot().view?.focusedPane).toBe(0)
    expect(chat.controller.getSnapshot().view?.panes[0].tabs).toEqual([
      leftSession,
      leftFile,
    ])
    expect(chat.controller.getSnapshot().view?.panes[1]?.tabs).toEqual([
      rightSession,
      rightFile,
      { kind: 'session', sessionId: 'client-1' },
    ])
    expect(chat.histories('client-1')).toBe(1)
    chat.controller.stop()
  })

  it('keeps a newer source-pane file selected while still placing a model session in that row', async () => {
    const chat = paneChat({
      answer: opensSession(codex),
      hold: (request) =>
        request.method === 'PUT' && request.url.endsWith('/model'),
    })
    await chat.controller.start()
    const picking = chat.controller.chooseModel('debounce', codex)
    chat.controller.updateView((view) => ({
      ...view,
      panes: [
        view.panes[0],
        { ...splitView.panes[1], ...view.panes[1], activeTab: rightFile },
      ],
    }))
    for (const release of chat.held.splice(0)) release()
    await picking
    expect(
      chat.controller.getSnapshot().view?.panes.map((pane) => pane.activeTab),
    ).toEqual([leftSession, rightFile])
    expect(chat.controller.getSnapshot().view?.panes[0].tabs).toEqual([
      leftSession,
      leftFile,
    ])
    expect(chat.controller.getSnapshot().view?.panes[1]?.tabs.at(-1)).toEqual({
      kind: 'session',
      sessionId: 'client-1',
    })
    expect(chat.histories('client-1')).toBe(0)
    chat.controller.stop()
  })

  it('shows a linked send in its unfocused source row and leaves the focused file and its reading place', async () => {
    const chat = paneChat({
      answer: async (request) => {
        if (request.method !== 'POST' || !request.url.endsWith('/messages'))
          return null
        const body = record(await request.json())
        return Response.json(
          {
            eventNumber: 0,
            turnId: 'linked-turn',
            session: linkedRecord({ sourceSessionId: 'debounce' }),
            message: acceptedIn(LINKED, text(body.id), text(body.text)),
          },
          { status: 202 },
        )
      },
    })
    setSplitView(chat, {
      ...splitView,
      panes: [
        { ...splitView.panes[0], activeTab: leftFile },
        splitView.panes[1],
      ],
    })
    await chat.controller.start()
    chat.controller.places.set(leftSession.sessionId, {
      kind: 'row',
      row: 'user:first',
      offset: 8,
    })
    chat.controller.setDraft('debounce', 'Send from the other pane')
    const draft = chat.draftOf('debounce')?.id
    await chat.controller.send('debounce')
    expect(chat.controller.getSnapshot().view?.focusedPane).toBe(0)
    expect(
      chat.controller.getSnapshot().view?.panes.map((pane) => pane.activeTab),
    ).toEqual([leftFile, { kind: 'session', sessionId: LINKED }])
    expect(chat.controller.getSnapshot().view?.panes[0].tabs).toEqual([
      leftSession,
      leftFile,
    ])
    expect(chat.controller.getSnapshot().view?.panes[1]?.tabs.at(-1)).toEqual({
      kind: 'session',
      sessionId: LINKED,
    })
    expect(chat.draftOf(LINKED)?.id).toBe(draft)
    expect(chat.controller.places.get(leftSession.sessionId)).toEqual({
      kind: 'row',
      row: 'user:first',
      offset: 8,
    })
    chat.controller.stop()
  })
})
