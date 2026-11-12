import { describe, expect, it } from 'vitest'
import { sessionPaths, sessionsPath } from '../../shared/sessions'
import type { WorkspaceTab } from '../../shared/workspace-view'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  choice,
  closed,
  diff,
  file,
  first,
  org,
  second,
  tabChat,
  ws,
} from './tab-order-test-kit'
import { newSessionRecord } from './test-kit'

describe('the chat tab order', () => {
  it('moves a session after a file and keeps the saved order on later view writes', async () => {
    const chat = tabChat([first, second, file])
    await chat.controller.start()
    chat.controller.moveTab(first, {
      after: { kind: 'file', path: 'src/app.ts', mode: 'preview' },
    })
    expect((await chat.savedView()).tabs).toEqual([second, file, first])
    expect(chat.row()).toEqual([second, file, first])
    expect(chat.controller.getSnapshot().activeSessionId).toBe(FAKE_IDS.session)

    await chat.controller.select('debounce')
    expect(await chat.savedView()).toEqual({
      tabs: [second, file, first],
      activeTab: second,
      temporaryTab: null,
      fileList: 'changes',
      tool: 'terminal',
    })
  })

  it('moves a session beside its visible neighbour without moving hidden file tabs', async () => {
    const chat = tabChat([file, first, diff, second])
    await chat.controller.start()
    expect(chat.row(false)).toEqual([first, second])
    chat.controller.moveTab(second, { before: first })
    expect((await chat.savedView()).tabs).toEqual([file, second, first, diff])
    expect(chat.row(false)).toEqual([second, first])
  })

  it('places the first session before a file opened in a new workspace', async () => {
    const chat = tabChat([])
    chat.setSessions([newSessionRecord(FAKE_IDS.session, choice)])
    await chat.controller.start()
    expect(chat.writes()).toEqual([])
    chat.controller.updateView((view) => ({
      ...view,
      tabs: [...view.tabs, file],
      activeTab: file,
    }))
    expect((await chat.savedView()).tabs).toEqual([first, file])
    expect(chat.row()).toEqual([first, file])
  })

  it('reopens a session at the end after dropping its old saved place', async () => {
    const chat = tabChat([closed, file])
    const old = newSessionRecord('postcode', choice, FAKE_TIME - 1)
    chat.setSessions(
      [
        newSessionRecord('debounce', choice, null, {
          createdAt: FAKE_TIME + 1,
        }),
        newSessionRecord(FAKE_IDS.session, choice),
      ],
      [old],
    )
    await chat.controller.start()
    expect(chat.writes()).toEqual([])
    chat.server.json('POST', sessionPaths.reopen(org, ws, 'postcode'), {
      session: { ...old, closedAt: null },
      eventNumber: chat.nextEventNumber(),
    })
    await chat.controller.reopen('postcode')
    expect((await chat.savedView()).tabs).toEqual([file, first, second, closed])
    expect(chat.row()).toEqual([file, first, second, closed])
    expect(chat.controller.getSnapshot().activeSessionId).toBe('postcode')
  })

  it('appends streamed and created sessions after a move and closes to the new neighbour', async () => {
    const chat = tabChat([first, second, file])
    await chat.controller.start()
    chat.controller.moveTab(second, { before: first })
    expect((await chat.savedView()).tabs).toEqual([second, first, file])
    expect(
      chat.controller.getSnapshot().sessions.map((session) => session.id),
    ).toEqual(['debounce', FAKE_IDS.session])

    const streamed: WorkspaceTab = { kind: 'session', sessionId: 'streamed' }
    chat.emit({
      type: 'session.updated',
      session: newSessionRecord('streamed', choice),
    })
    chat.controller.updateView((view) => ({
      ...view,
      tabs: [...view.tabs, diff],
    }))
    expect((await chat.savedView()).tabs).toEqual([
      second,
      first,
      file,
      streamed,
      diff,
    ])

    const created: WorkspaceTab = { kind: 'session', sessionId: 'third' }
    chat.server.json(
      'POST',
      sessionsPath(org, ws),
      {
        session: newSessionRecord('third', choice),
        eventNumber: chat.nextEventNumber(),
      },
      201,
    )
    await chat.controller.newSession()
    expect((await chat.savedView()).tabs).toEqual([
      second,
      first,
      file,
      streamed,
      diff,
      created,
    ])
    expect(chat.controller.getSnapshot().activeSessionId).toBe('third')

    await chat.controller.select('debounce')
    const closing = chat.controller.getSnapshot().sessions[0]
    chat.server.json('POST', sessionPaths.close(org, ws, 'debounce'), {
      session: { ...closing, closedAt: FAKE_TIME + 1 },
      eventNumber: chat.nextEventNumber(),
    })
    await chat.controller.requestClose('debounce')
    expect(chat.controller.getSnapshot().activeSessionId).toBe(FAKE_IDS.session)
    expect((await chat.savedView()).tabs).toEqual([
      first,
      file,
      streamed,
      diff,
      created,
    ])
  })

  it('keeps the view and sends no write when a workspace becomes read-only', async () => {
    let readOnly = false
    const chat = tabChat([first, second, file], { readOnly: () => readOnly })
    await chat.controller.start()
    readOnly = true
    const before = chat.controller.getSnapshot()
    chat.controller.moveTab(first, { after: file })
    expect(chat.controller.getSnapshot()).toBe(before)
    expect(chat.writes()).toEqual([])
    expect((await chat.savedView()).tabs).toEqual([first, second, file])
  })
})
