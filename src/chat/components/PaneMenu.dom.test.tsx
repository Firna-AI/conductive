// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import {
  leftFile,
  leftSession,
  rightFile,
  rightSession,
  splitView,
} from '../state/pane-test-kit'
import { columnStatus, onePane, statusOf } from './pane-drag-test-kit'
import { mountSplit, rowOn, tabsOf } from './split-test-kit'
import { debounce, fileTabs, settle } from './tab-drag-test-kit'
import { focused, menuItems, pressOn, rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The row that holds the element with the focus, by its name. */
const focusedRow = () =>
  document.activeElement?.closest('nav')?.getAttribute('aria-label') ?? null

describe('the pane item of the tab menu', () => {
  it('moves the tab to the end of the row of the other pane with Move to the other pane, shows it there, focuses that pane and the tab, and says the move', async () => {
    const chat = await mountSplit({ renderTab: fileTabs(testNavigation()) })
    const tab = byRole('button', 'Address autocomplete', rowOn('left'))
    act(() => tab.focus())
    pressOn(tab, 'F10', { shiftKey: true })
    const items = menuItems('Address autocomplete')
    await press(byRole('menuitem', 'Move to the other pane'))
    const { panes, focusedPane } = await chat.savedView()
    await settle()
    const moved = {
      focus: [focused(), focusedRow()],
      rows: [tabsOf(rowOn('left')), tabsOf(rowOn('right'))],
      status: columnStatus(),
    }
    // A later move of the tab in its row ends the words of the column.
    pressOn(byRole('button', 'Address autocomplete'), 'F10', { shiftKey: true })
    await press(byRole('menuitem', 'Move left'))
    await settle()

    expect({
      items: items.slice(-4),
      panes,
      focusedPane,
      moved,
      later: [columnStatus(), statusOf(rowOn('right'))],
    }).toEqual({
      items: [
        { name: 'Move left', off: true },
        { name: 'Move right', off: false },
        { name: 'Move to the other pane', off: false },
        { name: 'Close tabs to the right', off: false },
      ],
      panes: [
        { ...splitView.panes[0], tabs: [leftFile], activeTab: leftFile },
        {
          ...splitView.panes[1],
          tabs: [rightSession, rightFile, leftSession],
          activeTab: leftSession,
        },
      ],
      focusedPane: 1,
      moved: {
        focus: ['Address autocomplete', 'Sessions and files of the right pane'],
        rows: [['left.ts'], [debounce, 'right.ts', '[Address autocomplete]']],
        status: 'Address autocomplete moves to the right pane, place 3 of 3',
      },
      later: ['', 'Address autocomplete moves to place 2 of 3'],
    })
  })

  it('opens the tab in a new right pane with Open in a new pane, which shows it and takes the focus', async () => {
    const chat = await mountSplit({
      view: onePane([leftSession, rightSession]),
    })
    rightClick(byRole('button', debounce), { clientX: 150, clientY: 12 })
    const item = menuItems(debounce).find(
      (entry) => entry.name === 'Open in a new pane',
    )
    await press(byRole('menuitem', 'Open in a new pane'))
    const { panes, focusedPane } = await chat.savedView()
    await settle()

    expect({
      item,
      panes,
      focusedPane,
      focus: [focused(), focusedRow()],
      status: columnStatus(),
    }).toEqual({
      item: { name: 'Open in a new pane', off: false },
      panes: [
        { tabs: [leftSession], activeTab: leftSession, temporaryTab: null },
        { tabs: [rightSession], activeTab: rightSession, temporaryTab: null },
      ],
      focusedPane: 1,
      focus: [debounce, 'Sessions and files of the right pane'],
      status: `${debounce} moves to the right pane, place 1 of 1`,
    })
  })

  it('is off on a phone, where it reads Move to the other pane for a split', async () => {
    await mountSplit({ viewport: 'mobile' })
    rightClick(byRole('button', debounce, byLabel('Sessions and files')))
    expect(
      menuItems(debounce).find((entry) => entry.name.includes('pane')),
    ).toEqual({ name: 'Move to the other pane', off: true })
  })
})
