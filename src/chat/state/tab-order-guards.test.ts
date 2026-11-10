import { describe, expect, it } from 'vitest'
import { sessionsPath } from '../../shared/sessions'
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
  viewPath,
  ws,
} from './tab-order-test-kit'
import { newSessionRecord } from './test-kit'

describe('the chat tab order guards', () => {
  it('keeps saved tab places when a session opens during the load', async () => {
    let sessionReads = 0
    let reached = () => {}
    const reading = new Promise<void>((resolve) => {
      reached = resolve
    })
    const chat = tabChat([second, file, first], {
      hold: (request) => {
        if (
          request.method !== 'GET' ||
          new URL(request.url).pathname !== sessionsPath(org, ws)
        )
          return false
        sessionReads += 1
        if (sessionReads !== 2) return false
        reached()
        return true
      },
    })
    const existing = [
      newSessionRecord(FAKE_IDS.session, choice),
      newSessionRecord('debounce', choice, null, { createdAt: FAKE_TIME + 1 }),
    ]
    chat.setSessions(existing)
    const loading = chat.controller.start()
    await reading
    const session = newSessionRecord('third', choice, null, {
      createdAt: FAKE_TIME + 2,
    })
    chat.server.json(
      'POST',
      sessionsPath(org, ws),
      {
        session,
        eventNumber: chat.nextEventNumber(),
      },
      201,
    )
    await chat.controller.newSession()
    chat.setSessions([...existing, session])
    chat.held.splice(0, 1)[0]()
    await loading
    const created: WorkspaceTab = { kind: 'session', sessionId: 'third' }
    expect((await chat.savedView()).tabs).toEqual([
      second,
      file,
      first,
      created,
    ])
    expect(chat.row()).toEqual([second, file, first, created])
  })

  it('ignores moves before the view loads, outside the row, and without a change', async () => {
    const chat = tabChat([first, second, file], {
      hold: (request) =>
        request.method === 'GET' && new URL(request.url).pathname === viewPath,
    })
    const loading = chat.controller.start()
    const unloaded = chat.controller.getSnapshot()
    chat.controller.moveTab(first, { after: second })
    expect(chat.controller.getSnapshot()).toBe(unloaded)
    chat.held.splice(0, 1)[0]()
    await loading
    const before = chat.controller.getSnapshot()
    const absent: WorkspaceTab = {
      kind: 'file',
      path: 'missing',
      mode: 'source',
    }
    chat.controller.moveTab(closed, { before: first })
    chat.controller.moveTab(first, { after: closed })
    chat.controller.moveTab(absent, { before: first })
    chat.controller.moveTab(first, { before: absent })
    chat.controller.moveTab(first, { before: first })
    chat.controller.moveTab(first, { before: second })
    chat.controller.moveTab(second, { after: first })
    expect(chat.controller.getSnapshot()).toBe(before)
    expect(chat.writes()).toEqual([])
  })

  it('shows each visible tab once and appends browser-only session tabs', async () => {
    const preview: WorkspaceTab = {
      kind: 'file',
      path: 'src/app.ts',
      mode: 'preview',
    }
    const stale: WorkspaceTab = { kind: 'session', sessionId: 'unknown' }
    const saved = [first, first, file, preview, diff, diff, stale]
    const chat = tabChat(saved, { workspaceState: 'archived' })
    await chat.controller.start()
    expect(chat.row()).toEqual([first, file, diff, second])
    await chat.controller.reopen('postcode')
    expect(chat.row()).toEqual([first, file, diff, second, closed])
    await chat.controller.requestClose('autocomplete')
    expect(chat.row()).toEqual([file, diff, second, closed])
    expect(chat.row(false)).toEqual([second, closed])
    const before = chat.controller.getSnapshot()
    chat.controller.moveTab(closed, { before: second })
    expect(chat.controller.getSnapshot()).toBe(before)
    expect(chat.writes()).toEqual([])
    expect((await chat.savedView()).tabs).toEqual(saved)
  })

  it('reopens archived tabs at the end and closes to the next session in the row without writes', async () => {
    const saved = [first, second]
    const chat = tabChat(saved, { workspaceState: 'archived' })
    await chat.controller.start()
    await chat.controller.reopen('postcode')
    expect(chat.row()).toEqual([first, second, closed])

    await chat.controller.requestClose('autocomplete')
    expect(chat.row()).toEqual([second, closed])
    await chat.controller.reopen('autocomplete')
    expect(chat.row()).toEqual([second, closed, first])

    await chat.controller.requestClose('autocomplete')
    expect(chat.controller.getSnapshot().view?.tabs).toEqual([second, closed])
    chat.controller.updateView((view) => ({
      ...view,
      tabs: [first, ...view.tabs],
    }))
    expect(chat.row()).toEqual([second, closed])
    await chat.controller.reopen('autocomplete')
    expect(chat.row()).toEqual([second, closed, first])

    await chat.controller.select('debounce')
    expect(chat.row()).toEqual([second, closed, first])
    await chat.controller.requestClose('debounce')
    expect(chat.row()).toEqual([closed, first])
    expect(chat.controller.getSnapshot().activeSessionId).toBe('postcode')
    expect(chat.writes()).toEqual([])
    expect((await chat.savedView()).tabs).toEqual(saved)
  })
})
