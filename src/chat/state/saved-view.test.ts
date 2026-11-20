import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { sessionsPath } from '../../shared/sessions'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { viewToWire } from '../../shared/workspace-view-wire'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  choice,
  diff,
  file,
  first,
  org,
  second,
  tabChat,
  viewPath,
  ws,
} from './tab-order-test-kit'
import { newSessionRecord, opensSession, shown } from './test-kit'

const saved: WorkspaceView = {
  tabs: [second, file, first, diff, { kind: 'preview', port: 3000 }],
  activeTab: file,
  temporaryTab: { kind: 'file', path: 'src/app.ts' },
  fileList: 'checks',
  tool: 'desktop',
}

function unreadViewChat(
  answer?: (request: Request) => Promise<Response | null>,
) {
  const chat = tabChat(saved.tabs, {
    answer: async (request) =>
      request.method === 'GET' && new URL(request.url).pathname === viewPath
        ? Response.json({ error: 'The server failed.' }, { status: 503 })
        : (answer?.(request) ?? null),
  })
  chat.server.json('GET', viewPath, { view: viewToWire(saved) })
  chat.setSessions([
    newSessionRecord(FAKE_IDS.session, choice, null, {
      createdAt: FAKE_TIME - 2,
    }),
    newSessionRecord('debounce', choice, null, { createdAt: FAKE_TIME - 1 }),
  ])
  return chat
}

describe('a saved view that the chat could not read', () => {
  it('keeps the saved view and row order while selecting and creating sessions', async () => {
    const chat = unreadViewChat()
    await chat.controller.start()
    expect(chat.controller.getSnapshot().view).toBeNull()
    expect(chat.row()).toEqual([first, second])

    await chat.controller.select('debounce')
    const selected = chat.controller.getSnapshot()
    expect
      .soft({
        view: selected.view,
        active: selected.activeSessionId,
        row: chat.row(),
        history: shown(chat.controller, 'debounce').at(-1),
      })
      .toEqual({
        view: null,
        active: 'debounce',
        row: [first, second],
        history: 'end: 252000',
      })

    chat.server.json(
      'POST',
      sessionsPath(org, ws),
      {
        session: newSessionRecord('third', choice, null, {
          createdAt: FAKE_TIME + 2,
        }),
        eventNumber: chat.nextEventNumber(),
      },
      201,
    )
    await chat.controller.newSession()
    const created: WorkspaceTab = { kind: 'session', sessionId: 'third' }
    const snapshot = chat.controller.getSnapshot()
    expect
      .soft({
        view: snapshot.view,
        active: snapshot.activeSessionId,
        row: chat.row(),
        history: snapshot.sessionStates.third.hydration,
      })
      .toEqual({
        view: null,
        active: 'third',
        row: [first, second, created],
        history: 'ready',
      })
    expect.soft(chat.requests('PUT', viewPath)).toHaveLength(0)
    expect(await chat.savedView()).toEqual(saved)
  })

  it('moves a draft to the session of a model reply without replacing the unread view', async () => {
    const codex: AgentChoice = {
      agent: 'codex',
      model: 'GPT-6.1 Sol',
      effort: 'medium',
      fast: false,
    }
    const chat = unreadViewChat(opensSession(codex))
    await chat.controller.start()
    chat.controller.setDraft(FAKE_IDS.session, 'Check the postcode rules.')

    await chat.controller.chooseModel(FAKE_IDS.session, codex)

    const snapshot = chat.controller.getSnapshot()
    expect
      .soft({
        view: snapshot.view,
        active: snapshot.activeSessionId,
        row: chat.row(),
        source: chat.draftOf(FAKE_IDS.session)?.text,
        target: chat.draftOf('client-1')?.text,
        history: snapshot.sessionStates['client-1'].hydration,
      })
      .toEqual({
        view: null,
        active: 'client-1',
        row: [first, second, { kind: 'session', sessionId: 'client-1' }],
        source: '',
        target: 'Check the postcode rules.',
        history: 'ready',
      })
    expect.soft(chat.requests('PUT', viewPath)).toHaveLength(0)
    expect(await chat.savedView()).toEqual(saved)
  })
})
