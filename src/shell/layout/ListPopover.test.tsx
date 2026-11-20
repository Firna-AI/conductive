// @vitest-environment happy-dom

import { act } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { byLabel, byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press, settle } from '../test-mount'
import {
  hideSidebar,
  narrowWindow,
  openPopover,
  pointerDown,
  popover,
  rowOf,
  sidebar,
  sidebarShows,
  tile,
} from './list-popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** The sidebar toggle inside `within`, which reads Hide or Show. */
function hasToggle(within: HTMLElement): boolean {
  return (
    queryByRole('button', 'Hide the sidebar', within) !== null ||
    queryByRole('button', 'Show the sidebar', within) !== null
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the list popover of the org tile', () => {
  test('in a browser, the toggle beside Settings hides the sidebar, the tile of the org opens the list, and its toggle shows the sidebar again', async () => {
    const { view, navigation } = await openPaletteTab(
      routes.workspace(org, workspace),
    )
    const before = {
      shown: sidebarShows(view),
      expanded: tile(view, 'Acme').getAttribute('aria-expanded'),
    }
    hideSidebar(view)
    const hidden = {
      shown: sidebarShows(view),
      expanded: tile(view, 'Acme').getAttribute('aria-expanded'),
    }
    click(tile(view, 'Acme'))
    const list = openPopover()
    const opened = {
      address: navigation.href(),
      expanded: tile(view, 'Acme').getAttribute('aria-expanded'),
      settings: queryByRole('link', 'Settings', list) !== null,
      toggle: queryByRole('button', 'Show the sidebar', list) !== null,
    }
    click(byRole('button', 'Show the sidebar', list))
    expect({
      before,
      hidden,
      opened,
      after: { shown: sidebarShows(view), open: popover() !== null },
    }).toEqual({
      before: { shown: true, expanded: null },
      hidden: { shown: false, expanded: 'false' },
      opened: {
        address: routes.workspace(org, workspace),
        expanded: 'true',
        settings: true,
        toggle: true,
      },
      after: { shown: true, open: false },
    })
  })

  test('a press inside keeps it open, and a second click on the tile, Escape, and a press outside close it, and the Escape that closes it takes the key from the page', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    hideSidebar(view)
    const acme = tile(view, 'Acme')
    click(acme)
    click(acme)
    const afterSecondClick = popover() !== null
    click(acme)
    const escape = press(document.activeElement ?? document.body, 'Escape')
    const afterEscape = popover() !== null
    click(acme)
    act(() => pointerDown(rowOf(openPopover(), 'apple-pay')))
    const afterPressInside = popover() !== null
    act(() => pointerDown(document.body))
    expect({
      afterSecondClick,
      afterEscape,
      escapeTaken: escape.defaultPrevented,
      afterPressInside,
      afterPressOutside: popover() !== null,
    }).toEqual({
      afterSecondClick: false,
      afterEscape: false,
      escapeTaken: true,
      afterPressInside: true,
      afterPressOutside: false,
    })
  })

  test('a press in a menu of the list keeps it open, because the list owns that menu', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    hideSidebar(view)
    click(tile(view, 'Acme'))
    const list = openPopover()
    rightClick(rowOf(list, workspace), { clientX: 120, clientY: 200 })
    const menu = document.querySelector<HTMLElement>('[role="menu"]')
    if (!menu) throw new Error('The row menu did not open.')
    act(() => pointerDown(menu))
    expect({
      inside: list.contains(menu),
      open: popover() !== null,
    }).toEqual({ inside: false, open: true })
  })

  test('a workspace of the list opens and closes it, a click with a modifier key opens no popover, and a tile of another org opens that org first', async () => {
    const { view, navigation } = await openPaletteTab(routes.org(org))
    hideSidebar(view)
    act(() => {
      tile(view, 'Acme').dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          metaKey: true,
        }),
      )
    })
    const modifier = popover() !== null
    click(tile(view, 'Acme'))
    click(rowOf(openPopover(), workspace))
    await settle()
    const opened = { address: navigation.href(), open: popover() !== null }
    click(tile(view, 'Futex'))
    await settle()
    expect({
      modifier,
      opened,
      other: { address: navigation.href(), open: popover() !== null },
    }).toEqual({
      modifier: false,
      opened: { address: routes.workspace(org, workspace), open: false },
      other: { address: routes.org('futex'), open: false },
    })
  })

  test('in a narrow window, the tile opens it without a toggle on a workspace, and opens no popover on the list page', async () => {
    narrowWindow()
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    click(tile(view, 'Acme'))
    const list = popover()
    const onWorkspace = {
      open: list !== null,
      toggle: list ? hasToggle(list) : null,
    }
    press(document.activeElement ?? document.body, 'Escape')
    const listPage = await openPaletteTab(routes.org(org))
    click(tile(listPage.view, 'Acme'))
    expect({ onWorkspace, onListPage: popover() !== null }).toEqual({
      onWorkspace: { open: true, toggle: false },
      onListPage: false,
    })
  })

  test('in the Mac app, the toggle beside the window buttons hides the sidebar, and the popover has no second toggle', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace), {
      mac: true,
      platform: 'mac',
    })
    const besideSettings = hasToggle(sidebar(view) ?? view)
    click(byRole('button', 'Hide the sidebar', byLabel('Window controls')))
    click(tile(view, 'Acme'))
    const list = popover()
    expect({
      besideSettings,
      shown: sidebarShows(view),
      open: list !== null,
      toggle: list ? hasToggle(list) : null,
      showInControls:
        queryByRole(
          'button',
          'Show the sidebar',
          byLabel('Window controls'),
        ) !== null,
    }).toEqual({
      besideSettings: false,
      shown: false,
      open: true,
      toggle: false,
      showInControls: true,
    })
  })

  test('on Windows, Ctrl+B hides the sidebar of a browser tab and shows it again', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    pressCommand('toggle-sidebar', 'other', document.body)
    const hidden = sidebarShows(view)
    pressCommand('toggle-sidebar', 'other', document.body)
    expect({ hidden, shown: sidebarShows(view) }).toEqual({
      hidden: false,
      shown: true,
    })
  })
})
