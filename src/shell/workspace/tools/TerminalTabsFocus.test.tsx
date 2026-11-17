// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { HeldRequests } from '../../../app/test-kit'
import { terminalPaths } from '../../../shared/terminal'
import { byRole, queryByLabel } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { openPaletteTab } from '../../palette/palette-test-kit'
import { pressCommand } from '../../shortcuts/shortcut-test-kit'
import { click, settle } from '../../test-mount'
import { linkTo, openTab, socketsOf } from '../wiring-test-kit'
import { openTerminals, terminalTabs } from './terminal-tabs-kit'
import { toolHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const terminalAddress = toolHref(org, id, 'terminal')

/**
 * Where the keyboard focus is: in the xterm.js screen of the terminal that
 * shows, in the screen of a hidden terminal, or outside every screen.
 */
function focusPlace(view: HTMLElement): 'shown' | 'hidden' | 'outside' {
  const active = document.activeElement
  if (!active || !view.contains(active) || !active.closest('.xterm'))
    return 'outside'
  return active.closest('[hidden]') === null ? 'shown' : 'hidden'
}

/** Whether the row shows a given number of terminal tabs. */
function tabCount(view: HTMLElement, count: number): boolean {
  if (queryByLabel('Terminals', view) === null) return false
  return terminalTabs(view).names.length === count
}

describe('the focus after a control that shows a terminal', () => {
  test('on desktop, a click on a terminal tab moves the focus into its terminal, and a move along the tabs keeps it on the row', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    await openTerminals(server, 1)
    const { events } = socketsOf(server)
    const { view } = await openTab(server, routes.workspace(org, id), {
      events,
    })
    const second = byRole('link', 'Terminal 2', view)

    // Tab moves the focus along the row and activates no link.
    act(() => second.focus())
    await settle()
    const moved = {
      shown: terminalTabs(view).shown,
      onTab: document.activeElement === second,
      focus: focusPlace(view),
    }
    click(second)
    await settle()

    expect({ moved, shown: terminalTabs(view).shown }).toEqual({
      moved: { shown: ['Terminal 1'], onTab: true, focus: 'outside' },
      shown: ['Terminal 2'],
    })
    expect(focusPlace(view)).toBe('shown')
  })

  test('on desktop, the + moves the focus into the new terminal', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { events } = socketsOf(server)
    const { view } = await openTab(server, terminalAddress, { events })

    click(byRole('button', 'New terminal', view))
    await waitFor(() => tabCount(view, 2), 'a second terminal tab')
    await settle()

    expect({
      shown: terminalTabs(view).shown,
      focus: focusPlace(view),
    }).toEqual({ shown: ['Terminal 2'], focus: 'shown' })
  })

  test('on desktop, New terminal of the palette moves the focus into the new terminal, also while Preview shows', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = await openPaletteTab(toolHref(org, id, 'preview'), {
      server,
      events: socketsOf(server).events,
    })

    pressCommand('command-palette', 'other', document.body)
    click(byRole('option', 'New terminal'))
    await waitFor(() => tabCount(view, 2), 'a second terminal tab')
    await settle()

    expect({
      shown: terminalTabs(view).shown,
      focus: focusPlace(view),
    }).toEqual({ shown: ['Terminal 2'], focus: 'shown' })
  })

  test('on desktop, the focus stays where the user moved it while the open of the + ran', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const opens = terminalPaths.terminals(org, id)
    const held = new HeldRequests(server)
    held.holdAnswer('POST', opens)
    const { view } = await openPaletteTab(terminalAddress, {
      server,
      events: socketsOf(server).events,
      fetch: held.fetch,
    })
    const tools = byRole('region', 'Tools', view)
    const previewTab = linkTo(tools, toolHref(org, id, 'preview'))

    click(byRole('button', 'New terminal', view))
    await settle()
    act(() => previewTab.focus())
    await act(async () => held.release('POST', opens))
    await waitFor(
      () => terminalTabs(view).shown[0] === 'Terminal 2',
      'Terminal 2',
    )
    await settle()

    expect({
      focus: focusPlace(view),
      onPreviewTab: document.activeElement === previewTab,
    }).toEqual({ focus: 'outside', onPreviewTab: true })
  })

  test('on a phone, the + and a click on a terminal tab move no focus', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { events } = socketsOf(server)
    const { view } = await openTab(server, terminalAddress, {
      events,
      viewport: 'phone',
    })

    click(byRole('button', 'New terminal', view))
    await waitFor(() => tabCount(view, 2), 'a second terminal tab')
    await settle()
    const afterOpen = focusPlace(view)
    click(byRole('link', 'Terminal 1', view))
    await settle()

    expect({
      afterOpen,
      shown: terminalTabs(view).shown,
      afterTab: focusPlace(view),
    }).toEqual({
      afterOpen: 'outside',
      shown: ['Terminal 1'],
      afterTab: 'outside',
    })
  })
})
