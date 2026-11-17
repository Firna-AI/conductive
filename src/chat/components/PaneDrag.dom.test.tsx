// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { testNavigation } from '../../files/files-test-kit'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, pressKey } from '../../test-support/mount'
import {
  leftFile,
  leftSession,
  rightFile,
  rightSession,
  splitView,
} from '../state/pane-test-kit'
import {
  columnStatus,
  dragTo,
  layOutColumn,
  markIn,
  moveTo,
  onePane,
  paneContents,
  release,
  statusOf,
  viewSaves,
} from './pane-drag-test-kit'
import { mountSplit, rowOn, tabsOf } from './split-test-kit'
import { debounce, fileTabs, settle } from './tab-drag-test-kit'
import { menuItems, rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The open sessions of the fake workspace: Address autocomplete first. */
const openSessions = workspaceFixtures().sessions.sessions

describe('a drag of a tab onto the panes', () => {
  it('marks the half of the one pane under the tab and says the new pane, and a drop on the left half opens a left pane that shows the tab and takes the focus, while the old pane shows the tab after it', async () => {
    const chat = await mountSplit({
      view: onePane([leftSession, rightSession]),
    })
    layOutColumn()
    const row = byLabel('Sessions and files')
    const [content] = paneContents()
    const hovers = []
    dragTo(byRole('button', 'Address autocomplete', row), { x: 600, y: 300 })
    hovers.push({ mark: markIn(content), status: statusOf(row) })
    moveTo({ x: 200, y: 300 })
    hovers.push({ mark: markIn(content), status: statusOf(row) })
    release({ x: 200, y: 300 })
    const { panes, focusedPane } = await chat.savedView()
    await settle()

    expect({
      hovers,
      panes,
      focusedPane,
      rows: [tabsOf(rowOn('left')), tabsOf(rowOn('right'))],
      status: columnStatus(),
    }).toEqual({
      hovers: [
        {
          mark: 'right',
          status: 'Moving Address autocomplete to a new right pane',
        },
        {
          mark: 'left',
          status: 'Moving Address autocomplete to a new left pane',
        },
      ],
      panes: [
        { tabs: [leftSession], activeTab: leftSession, temporaryTab: null },
        { tabs: [rightSession], activeTab: rightSession, temporaryTab: null },
      ],
      focusedPane: 0,
      rows: [['[Address autocomplete]'], [`[${debounce}]`]],
      status: 'Address autocomplete moves to the left pane, place 1 of 1',
    })
  })

  it('shows no mark on a half of the one pane under its only tab, a drop there moves nothing, and the pane item of its tab menu is off', async () => {
    const chat = await mountSplit({
      view: onePane([leftSession]),
      setup: (fake) => fake.setSessions([openSessions[0]]),
    })
    layOutColumn()
    const row = byLabel('Sessions and files')
    dragTo(byRole('button', 'Address autocomplete', row), { x: 600, y: 300 })
    const hover = {
      mark: markIn(paneContents()[0]),
      status: statusOf(row),
      row: tabsOf(row),
    }
    release({ x: 600, y: 300 })
    await settle()
    rightClick(byRole('button', 'Address autocomplete', row))
    const item = menuItems('Address autocomplete').find((entry) =>
      entry.name.includes('pane'),
    )

    expect({ hover, saves: viewSaves(chat).length, item }).toEqual({
      hover: {
        mark: null,
        status: 'Moving Address autocomplete to place 1 of 1',
        row: ['[Address autocomplete]'],
      },
      saves: 0,
      item: { name: 'Open in a new pane', off: true },
    })
  })

  it('marks the other pane of a split under the tab, and a drop there moves the tab to the end of that row, shows it, focuses that pane, keeps the temporary tab that it was, and shows the tab before it in the pane that it left', async () => {
    const left = {
      tabs: [leftSession, leftFile],
      activeTab: leftFile,
      temporaryTab: { kind: 'file', path: leftFile.path },
    } as const
    const chat = await mountSplit({
      view: { ...splitView, panes: [left, splitView.panes[1]] },
      renderTab: fileTabs(testNavigation()),
    })
    layOutColumn()
    const [leftContent, rightContent] = paneContents()
    dragTo(byRole('link', 'left.ts', rowOn('left')), { x: 600, y: 300 })
    const hover = {
      marks: [markIn(leftContent), markIn(rightContent)],
      status: statusOf(rowOn('left')),
    }
    release({ x: 600, y: 300 })
    const { panes, focusedPane } = await chat.savedView()
    await settle()

    expect({ hover, panes, focusedPane, status: columnStatus() }).toEqual({
      hover: {
        marks: [null, 'pane'],
        status: 'Moving left.ts to the right pane, place 3 of 3',
      },
      panes: [
        { tabs: [leftSession], activeTab: leftSession, temporaryTab: null },
        {
          tabs: [rightSession, rightFile, leftFile],
          activeTab: leftFile,
          temporaryTab: { kind: 'diff', path: rightFile.path },
        },
      ],
      focusedPane: 1,
      status: 'left.ts moves to the right pane, place 3 of 3',
    })
  })

  it('shows no mark over the pane of the tab and moves nothing at its drop, and Escape over the other pane ends the drag with no move', async () => {
    const chat = await mountSplit()
    layOutColumn()
    const [leftContent, rightContent] = paneContents()
    const tab = byRole('button', 'Address autocomplete', rowOn('left'))
    const marks = () => [markIn(leftContent), markIn(rightContent)]
    dragTo(tab, { x: 200, y: 300 })
    const ownPane = { marks: marks(), status: statusOf(rowOn('left')) }
    release({ x: 200, y: 300 })
    dragTo(tab, { x: 600, y: 300 })
    const otherPane = marks()
    await pressKey('Escape')
    const afterEscape = { marks: marks(), status: statusOf(rowOn('left')) }
    release({ x: 600, y: 300 })
    await settle()

    expect({
      ownPane,
      otherPane,
      afterEscape,
      saves: viewSaves(chat).length,
      rows: [tabsOf(rowOn('left')), tabsOf(rowOn('right'))],
    }).toEqual({
      ownPane: {
        marks: [null, null],
        status: 'Moving Address autocomplete to place 1 of 1',
      },
      otherPane: [null, 'pane'],
      afterEscape: { marks: [null, null], status: '' },
      saves: 0,
      rows: [['[Address autocomplete]'], [`[${debounce}]`]],
    })
  })

  it('shows the drop line in the other row and says its pane and place, and a drop puts the tab there, shows it, and closes the pane that it left empty', async () => {
    const chat = await mountSplit({
      view: {
        ...splitView,
        panes: [
          { tabs: [leftSession], activeTab: leftSession, temporaryTab: null },
          splitView.panes[1],
        ],
      },
      renderTab: fileTabs(testNavigation()),
    })
    layOutColumn()
    // The right row holds the tabs of 401 to 501 px and 501 to 601 px.
    dragTo(byRole('button', 'Address autocomplete', rowOn('left')), {
      x: 520,
      y: 15,
    })
    const hover = {
      right: tabsOf(rowOn('right')),
      status: statusOf(rowOn('left')),
    }
    release({ x: 520, y: 15 })
    const { panes, focusedPane } = await chat.savedView()
    await settle()

    expect({
      hover,
      panes,
      focusedPane,
      row: tabsOf(byLabel('Sessions and files')),
      status: columnStatus(),
    }).toEqual({
      hover: {
        right: [`[${debounce}]`, '^', 'right.ts'],
        status: 'Moving Address autocomplete to the right pane, place 2 of 3',
      },
      panes: [
        {
          tabs: [rightSession, leftSession, rightFile],
          activeTab: leftSession,
          temporaryTab: { kind: 'diff', path: rightFile.path },
        },
      ],
      focusedPane: 0,
      row: [debounce, '[Address autocomplete]', 'right.ts'],
      status: 'Address autocomplete moves to the right pane, place 2 of 3',
    })
  })
})
