// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { pressOn, rightClick } from '../../chat/components/tab-row-test-kit'
import { workspacePath } from '../../shared/workspaces'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press, settle } from '../test-mount'
import {
  focusName,
  hover,
  menuItem,
  menuOf,
  menuPlace,
  placeBox,
  pressEnter,
  requestsFor,
  rowButtonNames,
  rowLink,
} from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
/** The open workspace: Checkout address autocomplete. */
const open = routes.workspace(org, workspace)
const actions = [
  'Move to section >',
  'Reassign to >',
  'Rename',
  'Copy link',
  'Archive',
]

/** The answer of a move of a workspace to a section. */
function movedTo(workspaceId: string, sectionId: string) {
  const { workspaces, detail } = workspaceFixtures()
  const moved = workspaces.workspaces.find((item) => item.id === workspaceId)
  if (!moved) throw new Error(`The fixture has no ${workspaceId}.`)
  return { ...detail, workspace: { ...moved, sectionId } }
}

describe('the menu of a workspace row', () => {
  test('a right click and the menu keys open the menu of the row where they point, give the focus back as it closes, and open no workspace, and no row has a button for the menu', async () => {
    const { server, navigation } = await openPaletteTab(open)
    const from = requestLines(server).length
    const link = rowLink('apple-pay')
    placeBox(link.parentElement, { left: 56, top: 307, width: 216, height: 26 })

    const browserMenu = rightClick(link, { clientX: 120, clientY: 300 })
    const pointer = {
      browserMenu,
      items: menuOf('Apple Pay button'),
      place: menuPlace('Apple Pay button'),
      focus: focusName(),
    }
    press(document.activeElement ?? document.body, 'Escape')
    const afterPointer = {
      items: menuOf('Apple Pay button'),
      focus: document.activeElement === link,
    }

    act(() => link.focus())
    const keyFree = pressOn(link, 'F10', { shiftKey: true })
    const keys = {
      keyFree,
      place: menuPlace('Apple Pay button'),
      focus: focusName(),
      // Some browsers send their menu event to the focus after the keys.
      browserMenu: rightClick(document.activeElement ?? document.body),
      menus: menuOf('Apple Pay button').length,
    }
    press(document.activeElement ?? document.body, 'Escape')
    pressOn(link, 'ContextMenu')
    const menuKey = menuOf('Apple Pay button')
    press(document.activeElement ?? document.body, 'Escape')
    await settle()

    expect({
      rowButtons: rowButtonNames(),
      pointer,
      afterPointer,
      keys,
      menuKey,
      focus: document.activeElement === link,
      history: navigation.history,
      requests: requestsFor(server, 'apple-pay', from),
    }).toEqual({
      rowButtons: ['Archive workspace'],
      pointer: {
        browserMenu: false,
        items: actions,
        place: { left: '120px', top: '300px' },
        focus: 'Move to section',
      },
      afterPointer: { items: [], focus: true },
      keys: {
        keyFree: false,
        place: { left: '56px', top: '337px' },
        focus: 'Move to section',
        browserMenu: false,
        menus: 5,
      },
      menuKey: actions,
      focus: true,
      history: [open],
      requests: [],
    })
  })

  test('the choices show on hover and with Right, close with Left and Escape before the menu, and a section moves the row to its top with the focus on its new link', async () => {
    const server = new FakeApiServer()
    const path = workspacePath(org, 'apple-pay')
    server.json('PATCH', path, movedTo('apple-pay', 'general'))
    await openPaletteTab(open, { server })
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    hover(menuItem('Move to section'))
    const hovered = { sections: menuOf('Section'), focus: focusName() }
    hover(menuItem('Rename'))
    const away = menuOf('Section')
    act(() => menuItem('Move to section').focus())
    press(menuItem('Move to section'), 'ArrowRight')
    const right = focusName()
    press(document.activeElement ?? document.body, 'ArrowLeft')
    const left = { sections: menuOf('Section'), focus: focusName() }
    press(menuItem('Move to section'), 'ArrowRight')
    press(document.activeElement ?? document.body, 'Escape')
    const firstEscape = {
      sections: menuOf('Section'),
      menu: menuOf('Apple Pay button').length,
      focus: focusName(),
    }
    press(document.activeElement ?? document.body, 'Escape')
    const secondEscape = menuOf('Apple Pay button')

    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Move to section'))
    click(menuItem('Checkout'))
    const sameSection = requestsFor(server, 'apple-pay')
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    // Each press of a person is its own task, so the row lets the focus go
    // to the menu before the move replaces the row.
    await settle()
    click(menuItem('Move to section'))
    click(menuItem('General'))
    await settle()
    const general = byRole('region', 'General')
    const moved = rowLink('apple-pay')
    const afterMove = {
      focus: document.activeElement === moved,
      inGeneral: general.contains(moved),
    }
    // The palette key closes the menu and opens the palette.
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    pressCommand('command-palette', 'other')
    const paletteKey = {
      menu: menuOf('Apple Pay button'),
      palette: palette() !== null,
    }
    const patch = server.requests.find(
      (request) => request.method === 'PATCH' && request.url.endsWith(path),
    )

    expect({
      hovered,
      away,
      right,
      left,
      firstEscape,
      secondEscape,
      sameSection,
      body: await patch?.json(),
      first: general.querySelector('li a')?.getAttribute('href'),
      afterMove,
      paletteKey,
    }).toEqual({
      hovered: {
        sections: ['General', 'Checkout (checked)', 'Infra'],
        focus: 'Move to section',
      },
      away: [],
      right: 'Checkout',
      left: { sections: [], focus: 'Move to section' },
      firstEscape: { sections: [], menu: 5, focus: 'Move to section' },
      secondEscape: [],
      sameSection: [],
      body: { sectionId: 'general', position: 0 },
      first: routes.workspace(org, 'apple-pay'),
      afterMove: { focus: true, inGeneral: true },
      paletteKey: { menu: [], palette: true },
    })
  })

  test('in the phone layout, a right click or the menu keys open a sheet with the name of the workspace, the choices of an action take the place of the actions, a move by keys gives the focus to the new link of the row, and Rename puts the focus in its field', async () => {
    const server = new FakeApiServer()
    server.json(
      'PATCH',
      workspacePath(org, 'invoice-fonts'),
      movedTo('invoice-fonts', 'checkout'),
    )
    await openPaletteTab(routes.org(org), { server, viewport: 'phone' })
    const rowButtons = rowButtonNames()
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    const sheet = byRole('dialog', 'Apple Pay button')
    const actionsShown = menuOf('Apple Pay button')
    click(menuItem('Move to section'))
    const choices = {
      sheet: queryByRole('dialog', 'Apple Pay button') !== null,
      actions: menuOf('Apple Pay button'),
      sections: menuOf('Section'),
      focus: focusName(),
      inSheet: sheet.contains(document.activeElement),
    }
    click(menuItem('Infra'))
    await settle()
    const closed = queryByRole('dialog', 'Apple Pay button')
    // The menu keys open the sheet of the focused row, and keys choose
    // another section. The row moves, and its new link takes the focus.
    act(() => rowLink('invoice-fonts').focus())
    pressOn(rowLink('invoice-fonts'), 'F10', { shiftKey: true })
    await settle()
    pressEnter()
    press(document.activeElement ?? document.body, 'ArrowDown')
    pressEnter()
    await settle()
    const fonts = rowLink('invoice-fonts')
    const keyMove = {
      sheet: queryByRole('dialog', 'Invoice PDF fonts'),
      focus: document.activeElement === fonts,
      inCheckout: byRole('region', 'Checkout').contains(fonts),
    }
    // The sheet closes as Rename opens the field, which then takes the focus.
    rightClick(rowLink('pricing-copy'), { clientX: 120, clientY: 300 })
    click(menuItem('Rename'))
    await settle()
    const field = queryByRole('textbox', 'Workspace name')

    expect({
      rowButtons,
      actionsShown,
      choices,
      closed,
      keyMove,
      moves: requestsFor(server, 'apple-pay'),
      rename: {
        sheet: queryByRole('dialog', 'Pricing page copy'),
        focus: field !== null && document.activeElement === field,
      },
    }).toEqual({
      rowButtons: ['Archive workspace'],
      actionsShown: actions,
      choices: {
        sheet: true,
        actions: [],
        sections: ['General', 'Checkout (checked)', 'Infra'],
        focus: 'Checkout',
        inSheet: true,
      },
      closed: null,
      keyMove: { sheet: null, focus: true, inCheckout: true },
      moves: [`PATCH ${workspacePath(org, 'apple-pay')}`],
      rename: { sheet: null, focus: true },
    })
  })
})
