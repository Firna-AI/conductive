// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { sessionsPath } from '../../shared/sessions'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { leftFile, showFiles, splitView } from '../state/pane-test-kit'
import { choice } from '../state/tab-order-test-kit'
import { newSessionRecord } from '../state/test-kit'
import { mountSplit, tabsOf } from './split-test-kit'
import { debounce } from './tab-drag-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

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
})
