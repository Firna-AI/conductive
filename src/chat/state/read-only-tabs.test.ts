import { describe, expect, it } from 'vitest'
import { sessionsPath } from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  closed,
  file,
  first,
  org,
  second,
  tabChat,
  viewPath,
  ws,
} from './tab-order-test-kit'

describe('the browser view of read-only tabs', () => {
  it('keeps a locally closed tab out and a reopened tab shown when session updates arrive after an org suspension', async () => {
    let readOnly = false
    const chat = tabChat([first, second, file], {
      readOnly: () => readOnly,
    })
    await chat.controller.start()
    const before = chat.controller.getSnapshot()
    readOnly = true

    await chat.controller.requestClose(FAKE_IDS.session)
    const locallyClosed = chat.controller.getSnapshot().view
    chat.emit({
      type: 'session.updated',
      session: { ...before.sessions[0], title: 'Updated while suspended' },
    })
    expect(chat.controller.getSnapshot().view).toEqual(locallyClosed)
    expect(chat.row()).toEqual([second, file])
    expect(
      chat.controller
        .getSnapshot()
        .sessions.find((item) => item.id === FAKE_IDS.session)?.title,
    ).toBe('Updated while suspended')

    await chat.controller.reopen('postcode')
    const locallyReopened = chat.controller.getSnapshot().view
    const stored = before.history.find((item) => item.id === 'postcode')
    if (!stored) throw new Error('The fixture has no closed session.')
    chat.emit({
      type: 'session.updated',
      session: { ...stored, title: 'Updated closed session' },
    })
    expect(chat.controller.getSnapshot().view).toEqual(locallyReopened)
    expect(chat.row()).toEqual([second, file, closed])
    expect(chat.controller.getSnapshot().activeSessionId).toBe('postcode')
    expect(
      chat.controller
        .getSnapshot()
        .history.find((item) => item.id === 'postcode')?.title,
    ).toBe('Updated closed session')
    expect(chat.writes()).toEqual([])
  })

  it('keeps the other tabs when a local select, close, and reopen follow a failed view load', async () => {
    const chat = tabChat([], { readOnly: () => true })
    chat.server.json(
      'GET',
      viewPath,
      { error: { code: 'unavailable', message: 'The view did not load.' } },
      503,
    )
    await chat.controller.start()
    expect(chat.row()).toEqual([second, first])

    await chat.controller.select('debounce')
    expect(chat.controller.getSnapshot().view?.tabs).toEqual([second, first])
    expect(chat.controller.getSnapshot().view?.activeTab).toEqual(second)
    await chat.controller.requestClose(FAKE_IDS.session)
    expect(chat.row()).toEqual([second])
    await chat.controller.reopen(FAKE_IDS.session)
    expect(chat.row()).toEqual([second, first])
    expect(chat.writes()).toEqual([])
  })

  it('keeps local tabs and selection when the second session read of a read-only load arrives', async () => {
    let reads = 0
    let reached = () => {}
    const reading = new Promise<void>((resolve) => {
      reached = resolve
    })
    const chat = tabChat([first, second, file], {
      readOnly: () => true,
      hold: (request) => {
        if (new URL(request.url).pathname !== sessionsPath(org, ws))
          return false
        reads += 1
        if (reads !== 2) return false
        reached()
        return true
      },
    })
    const loading = chat.controller.start()
    await reading
    await chat.controller.requestClose(FAKE_IDS.session)
    await chat.controller.reopen('postcode')
    chat.held.splice(0, 1)[0]()
    await loading

    expect(chat.row()).toEqual([second, file, closed])
    expect(chat.controller.getSnapshot().view?.tabs).toEqual([
      second,
      file,
      closed,
    ])
    expect(chat.controller.getSnapshot().view?.activeTab).toEqual(closed)
    expect(chat.controller.getSnapshot().activeSessionId).toBe('postcode')
    expect(chat.writes()).toEqual([])
  })
})
