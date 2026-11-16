// @vitest-environment happy-dom

import { act } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press, settle } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/** The tile of an org in the rail. */
function tile(view: HTMLElement, name: string): HTMLElement {
  return byRole('link', name, byLabel('Orgs', view))
}

/** The sidebar of the frame, while it shows. */
function sidebar(view: HTMLElement): HTMLElement | null {
  return view.querySelector<HTMLElement>('aside[aria-label="Workspaces"]')
}

function sidebarShows(view: HTMLElement): boolean {
  const aside = sidebar(view)
  return aside !== null && !aside.hidden
}

/** The sidebar toggle inside `within`, which reads Hide or Show. */
function hasToggle(within: HTMLElement): boolean {
  return (
    queryByRole('button', 'Hide the sidebar', within) !== null ||
    queryByRole('button', 'Show the sidebar', within) !== null
  )
}

/** The list popover, while it is open. */
function popover(): HTMLElement | null {
  return queryByLabel('Workspace list')
}

/** Makes the window narrower than 900 px, where the sidebar hides. */
function narrowWindow(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('max-width: 899px'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
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
    click(byRole('button', 'Hide the sidebar', sidebar(view) ?? view))
    const hidden = {
      shown: sidebarShows(view),
      expanded: tile(view, 'Acme').getAttribute('aria-expanded'),
    }
    click(tile(view, 'Acme'))
    const list = popover()
    const opened = {
      address: navigation.href(),
      expanded: tile(view, 'Acme').getAttribute('aria-expanded'),
      settings: list ? queryByRole('link', 'Settings', list) !== null : false,
      toggle: list
        ? queryByRole('button', 'Show the sidebar', list) !== null
        : false,
    }
    if (list) click(byRole('button', 'Show the sidebar', list))
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

  test('a second click on the tile and Escape close it, Escape gives the focus back to the tile, and a press outside closes it', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    click(byRole('button', 'Hide the sidebar', sidebar(view) ?? view))
    const acme = tile(view, 'Acme')
    click(acme)
    click(acme)
    const afterSecondClick = popover() !== null
    click(acme)
    press(document.body, 'Escape')
    const afterEscape = {
      open: popover() !== null,
      focus: document.activeElement === acme,
    }
    click(acme)
    act(() => {
      byLabel('Orgs', view).parentElement?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      )
    })
    const pressInside = popover() !== null
    act(() => {
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      )
    })
    expect({
      afterSecondClick,
      afterEscape,
      pressInside,
      afterPressOutside: popover() !== null,
    }).toEqual({
      afterSecondClick: false,
      afterEscape: { open: false, focus: true },
      pressInside: false,
      afterPressOutside: false,
    })
  })

  test('a press in a menu of the list keeps it open, because the list owns that menu', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    click(byRole('button', 'Hide the sidebar', sidebar(view) ?? view))
    click(tile(view, 'Acme'))
    const list = popover()
    if (!list) throw new Error('The popover did not open.')
    const row = list.querySelector<HTMLElement>(
      `a[href="${routes.workspace(org, workspace)}"]`,
    )
    if (!row) throw new Error('The list has no row of the workspace.')
    act(() => {
      row.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 120,
          clientY: 200,
        }),
      )
    })
    const menu = document.querySelector<HTMLElement>('[role="menu"]')
    if (!menu) throw new Error('The row menu did not open.')
    act(() => {
      menu.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })
    expect({
      inside: list.contains(menu),
      open: popover() !== null,
    }).toEqual({ inside: false, open: true })
  })

  test('a workspace of the list opens and closes it, and a tile of another org opens that org first', async () => {
    const { view, navigation } = await openPaletteTab(routes.org(org))
    click(byRole('button', 'Hide the sidebar', sidebar(view) ?? view))
    click(tile(view, 'Acme'))
    const list = popover()
    if (!list) throw new Error('The popover did not open.')
    const row = list.querySelector<HTMLElement>(
      `a[href="${routes.workspace(org, workspace)}"]`,
    )
    if (!row) throw new Error('The list has no row of the workspace.')
    click(row)
    await settle()
    const opened = {
      address: navigation.href(),
      open: popover() !== null,
    }
    click(tile(view, 'Futex'))
    await settle()
    expect({
      opened,
      other: {
        address: navigation.href(),
        open: popover() !== null,
      },
    }).toEqual({
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
    press(document.body, 'Escape')
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
