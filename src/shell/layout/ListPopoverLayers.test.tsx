// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { workspacePath } from '../../shared/workspaces'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { menuItem } from '../list/row-menu-test-kit'
import { openPaletteTab, options, palette } from '../palette/palette-test-kit'
import { pressCommand, pressHintKey } from '../shortcuts/shortcut-test-kit'
import { click, press, settle, typeText } from '../test-mount'
import {
  focusOf,
  hideSidebar,
  openPopover,
  popover,
  rowOf,
  tile,
} from './list-popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const applePay = workspacePath(org, 'apple-pay')

/** The fake API answers a rename of Apple Pay button with `name`. */
function serveRename(server: FakeApiServer, name: string): void {
  const { workspaces, detail } = workspaceFixtures()
  const item = workspaces.workspaces.find((row) => row.id === 'apple-pay')
  if (!item) throw new Error('The fixture has no Apple Pay button.')
  server.json('PATCH', applePay, { ...detail, workspace: { ...item, name } })
}

/** The requests that change something, after the first `from`. */
function writesAfter(server: FakeApiServer, from: number): string[] {
  return server.requests
    .slice(from)
    .filter((request) => request.method !== 'GET')
    .map((request) => `${request.method} ${new URL(request.url).pathname}`)
}

/** Opens the rename field of Apple Pay button in the open popover. */
function renameApplePay(list: HTMLElement): HTMLInputElement {
  rightClick(rowOf(list, 'apple-pay'), { clientX: 120, clientY: 300 })
  click(menuItem('Rename'))
  const field = list.querySelector<HTMLInputElement>(
    'input[aria-label="Workspace name"]',
  )
  if (!field) throw new Error('The rename field did not open.')
  return field
}

/** The palette rows on its Actions tab that name New section. */
function newSectionRows(): number {
  click(byRole('tab', 'Actions'))
  return options().filter((row) => row.textContent?.includes('New section'))
    .length
}

describe('Escape in and over the list popover', () => {
  test('Escape in a rename field of the popover cancels the rename, also while an input method composes', async () => {
    const server = new FakeApiServer()
    serveRename(server, 'Changed name')
    const { view } = await openPaletteTab(routes.workspace(org, workspace), {
      server,
    })
    hideSidebar(view)
    click(tile(view, 'Acme'))
    const list = openPopover()
    const from = server.requests.length
    const composing = renameApplePay(list)
    typeText(composing, 'Apple Pay 決済')
    composing.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    await settle()
    const whileComposing = {
      open: popover() !== null,
      field: composing.isConnected,
    }
    press(composing, 'Escape')
    await settle()
    const field = renameApplePay(list)
    typeText(field, 'Changed name')
    press(field, 'Escape')
    await settle()
    expect({
      whileComposing,
      open: popover() !== null,
      writes: writesAfter(server, from),
    }).toEqual({
      whileComposing: { open: true, field: true },
      open: true,
      writes: [],
    })
  })

  test('Escape in the section name field of the popover cancels the rename', async () => {
    const server = new FakeApiServer()
    const { view } = await openPaletteTab(routes.workspace(org, workspace), {
      server,
    })
    hideSidebar(view)
    click(tile(view, 'Acme'))
    const list = openPopover()
    const from = server.requests.length
    click(byRole('button', 'More for General', list))
    click(menuItem('Rename section'))
    const field = byRole('textbox', 'Section name', list)
    if (!(field instanceof HTMLInputElement)) throw new Error('No text field.')
    typeText(field, 'Renamed section')
    press(field, 'Escape')
    await settle()
    expect({
      open: popover() !== null,
      writes: writesAfter(server, from),
    }).toEqual({ open: true, writes: [] })
  })

  test('the first Escape closes the palette that its key opened over the popover, and the second closes the popover', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    hideSidebar(view)
    click(tile(view, 'Acme'))
    pressCommand('command-palette', 'other', document.body)
    const state = () => ({
      palette: palette() !== null,
      popover: popover() !== null,
    })
    const opened = state()
    press(document.activeElement ?? document.body, 'Escape')
    await settle()
    const first = state()
    press(document.activeElement ?? document.body, 'Escape')
    await settle()
    expect({ opened, first, second: state() }).toEqual({
      opened: { palette: true, popover: true },
      first: { palette: false, popover: true },
      second: { palette: false, popover: false },
    })
  })
})

describe('the focus and the offers of the list popover', () => {
  test('the focus goes back to the tile after the palette of Search and after Show the sidebar, and to the page after a row', async () => {
    const { view } = await openPaletteTab(routes.workspace(org, workspace))
    hideSidebar(view)
    const acme = tile(view, 'Acme')
    click(acme)
    const opened = document.activeElement?.closest('a')?.getAttribute('href')
    click(byRole('button', 'Search', openPopover()))
    await settle()
    const search = { palette: palette() !== null, popover: popover() !== null }
    press(document.activeElement ?? document.body, 'Escape')
    await settle()
    const afterPalette = focusOf(acme)
    click(acme)
    click(byRole('button', 'Show the sidebar', openPopover()))
    await settle()
    const afterToggle = focusOf(acme)
    hideSidebar(view)
    click(acme)
    click(rowOf(openPopover(), 'apple-pay'))
    await settle()
    expect({
      opened,
      search,
      afterPalette,
      afterToggle,
      afterRow: focusOf(acme),
    }).toEqual({
      opened: routes.workspace(org, workspace),
      search: { palette: true, popover: false },
      afterPalette: 'tile',
      afterToggle: 'tile',
      afterRow: 'elsewhere',
    })
  })

  test('only the list that shows offers its keys and New section: the open popover, not the hidden sidebar', async () => {
    holdAnimationFrames()
    const { app, view, navigation } = await openPaletteTab(
      routes.workspace(org, workspace),
    )
    hideSidebar(view)
    const before = navigation.history.length
    const hiddenKey = pressHintKey(app, 'next-workspace', document.body)
    await settle()
    const hidden = {
      key: hiddenKey.defaultPrevented,
      moved: navigation.history.length - before,
    }
    pressCommand('command-palette', 'other', document.body)
    const closedRows = newSectionRows()
    press(document.activeElement ?? document.body, 'Escape')
    await settle()
    click(tile(view, 'Acme'))
    pressCommand('command-palette', 'other', document.body)
    const openRows = newSectionRows()
    press(document.activeElement ?? document.body, 'Escape')
    await settle()
    const from = navigation.history.length
    const openKey = pressHintKey(app, 'next-workspace', document.body)
    await settle()
    expect({
      hidden,
      closedRows,
      openRows,
      open: {
        key: openKey.defaultPrevented,
        moved: navigation.history.length - from,
      },
    }).toEqual({
      hidden: { key: false, moved: 0 },
      closedRows: 0,
      openRows: 1,
      open: { key: true, moved: 1 },
    })
  })
})
