// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { sessionsPath } from '../../shared/sessions'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  leftFile,
  leftSession,
  rightFile,
  rightSession,
  showFiles,
  splitView,
} from '../state/pane-test-kit'
import { choice } from '../state/tab-order-test-kit'
import { newSessionRecord } from '../state/test-kit'
import {
  dragTo,
  release,
  setBox,
  statusOf,
  viewSaves,
} from './pane-drag-test-kit'
import { mountSplit, tabsOf } from './split-test-kit'
import { debounce, settle } from './tab-drag-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The list item of a tab. */
function itemOf(tab: HTMLElement): HTMLElement {
  const item = tab.closest('li')
  if (!item) throw new Error(`The tab ${tab.textContent} has no list item.`)
  return item
}

/** The names of the controls of the one row, after its list of tabs. */
function rowControls(row: HTMLElement): string[] {
  return Array.from(
    row.querySelectorAll(':scope > button, :scope > span button'),
    (control) => control.getAttribute('aria-label') ?? '',
  )
}

describe('a split on a phone', () => {
  it('shows one row with the session tabs of both panes, a line between them, one +, and the history at its end, and the chat of the focused pane, else of the other pane', async () => {
    const chat = await mountSplit({ viewport: 'mobile' })
    const row = byLabel('Sessions and files')
    const steps = [tabsOf(row)]
    act(() =>
      chat.controller.updateView((view) => ({
        ...view,
        panes: [
          { ...view.panes[0], activeTab: leftFile },
          view.panes[1] ?? splitView.panes[1],
        ],
      })),
    )
    steps.push(tabsOf(row))
    act(() => showFiles(chat))
    steps.push(tabsOf(row))
    expect({
      steps,
      controls: rowControls(row),
      rows: document.querySelectorAll('nav').length,
    }).toEqual({
      steps: [
        ['[Address autocomplete]', '|', debounce],
        ['Address autocomplete', '|', `[${debounce}]`],
        ['[Address autocomplete]', '|', debounce],
      ],
      controls: ['New session', 'Session history'],
      rows: 1,
    })
  })

  it('opens the session of its one + in the focused pane', async () => {
    const chat = await mountSplit({ viewport: 'mobile' })
    chat.server.json(
      'POST',
      sessionsPath(FAKE_IDS.org, FAKE_IDS.workspace),
      {
        session: newSessionRecord('from-plus', choice),
        eventNumber: chat.nextEventNumber(),
      },
      201,
    )
    act(() => chat.controller.focusPane(1))
    await press(byRole('button', 'New session'))
    const opened = await waitFor(
      () => chat.controller.getSnapshot().view?.panes[1]?.activeTab,
      'the new session',
    )
    expect({
      opened,
      row: tabsOf(byLabel('Sessions and files')),
    }).toEqual({
      opened: { kind: 'session', sessionId: 'from-plus' },
      row: ['Address autocomplete', '|', debounce, '[Untitled]'],
    })
  })

  it('drops a tab at the end of the left part of the one row, which moves it to the left pane and says so, and a drop on the chat moves nothing', async () => {
    const chat = await mountSplit({ viewport: 'mobile' })
    const row = byLabel('Sessions and files')
    const first = byRole('button', 'Address autocomplete', row)
    const second = byRole('button', debounce, row)
    // The line between the parts takes 9 px: 1 px and 4 px on each side,
    // so its middle is at 104.5 px.
    setBox(itemOf(first), { left: 0, top: 0, width: 100, height: 40 })
    setBox(itemOf(second), { left: 109, top: 0, width: 100, height: 40 })
    const chatArea = byLabel('Chat').parentElement ?? document.body
    setBox(chatArea, { left: 0, top: 40, width: 390, height: 600 })

    dragTo(second, { x: 102, y: 20 })
    const hover = { row: tabsOf(row), status: statusOf(row) }
    release({ x: 102, y: 20 })
    const { panes, focusedPane } = await chat.savedView()
    await settle()
    const moved = { row: tabsOf(row), status: statusOf(row) }
    const saves = viewSaves(chat).length
    // Over the row, this point is after the last tab.
    dragTo(first, { x: 250, y: 300 })
    const overChat = { row: tabsOf(row), status: statusOf(row) }
    release({ x: 250, y: 300 })
    await settle()

    expect({
      hover,
      panes,
      focusedPane,
      moved,
      overChat,
      newSaves: viewSaves(chat).length - saves,
    }).toEqual({
      hover: {
        row: ['[Address autocomplete]', '^', '|', debounce],
        status: `Moving ${debounce} to the left pane, place 2 of 2`,
      },
      panes: [
        {
          ...splitView.panes[0],
          tabs: [leftSession, rightSession, leftFile],
          activeTab: rightSession,
        },
        { ...splitView.panes[1], tabs: [rightFile], activeTab: rightFile },
      ],
      focusedPane: 0,
      moved: {
        row: ['Address autocomplete', `[${debounce}]`],
        status: `${debounce} moves to the left pane, place 2 of 2`,
      },
      overChat: {
        row: ['Address autocomplete', `[${debounce}]`],
        status: 'Moving Address autocomplete to place 1 of 2',
      },
      newSaves: 0,
    })
  })
})
