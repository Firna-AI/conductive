// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../app/test-kit'
import { routes } from '../../app/router'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { workspacePath } from '../../shared/workspaces'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import {
  focusName,
  menuItem,
  menuOf,
  menuPlace,
  placeBox,
  requestsFor,
  rowLink,
} from '../list/row-menu-test-kit'
import { openPaletteTab } from '../palette/palette-test-kit'
import { click, press, settle, typeText } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const open = routes.workspace(org, workspace)
const name = 'Checkout address autocomplete'

/** The header of the open workspace, with its name or the field of Rename. */
function header(): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    'header:has(h1, input[aria-label="Workspace name"])',
  )
  if (!found) throw new Error('The workspace has no header.')
  return found
}

/** The name of the open workspace in its header. */
function title(): HTMLElement {
  const found = header().querySelector<HTMLElement>('h1')
  if (!found) throw new Error('The header has no name.')
  return found
}

/** The name of the open workspace in its header, as the button of its menu. */
function nameButton(shown = name): HTMLElement {
  return byRole('button', `${shown}. Workspace menu`, header())
}

/**
 * Presses the pointer on an element, then clicks it, as a mouse does. A
 * browser applies the changes of the press before the click.
 */
function pointerPress(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
    )
  })
  act(() => element.click())
}

/** The bodies of the writes of the name of the open workspace. */
async function nameWrites(server: FakeApiServer): Promise<unknown[]> {
  const path = workspacePath(org, workspace)
  const writes = server.requests.filter(
    (request) => request.method === 'PATCH' && request.url.endsWith(path),
  )
  return Promise.all(writes.map((request) => request.json()))
}

describe('the workspace menu in the header', () => {
  test('a click on the name opens the menu of the row of the open workspace below the name, a second press on the name closes it, Escape gives the focus back to the name, and a right click on the bar opens no menu and sends no request', async () => {
    const { server, navigation } = await openPaletteTab(open)
    rightClick(rowLink(workspace), { clientX: 120, clientY: 300 })
    const rowItems = menuOf(name)
    press(document.activeElement ?? document.body, 'Escape')
    const from = requestLines(server).length

    const button = nameButton()
    placeBox(button, { left: 290, top: 8, width: 220, height: 26 })
    const closedState = button.getAttribute('aria-expanded')
    click(button)
    const opened = {
      items: menuOf(name),
      place: menuPlace(name),
      focus: focusName(),
      expanded: button.getAttribute('aria-expanded'),
    }
    // A pointer press on the name of an open menu closes it.
    pointerPress(button)
    const pressedAgain = menuOf(name)
    click(button)
    press(document.activeElement ?? document.body, 'Escape')
    const escaped = {
      items: menuOf(name),
      focus: document.activeElement === button,
    }
    const onBar = {
      browserMenu: rightClick(header(), { clientX: 700, clientY: 20 }),
      items: menuOf(name),
    }
    await settle()

    expect({
      closedState,
      opened,
      pressedAgain,
      escaped,
      onBar,
      history: navigation.history,
      requests: requestsFor(server, workspace, from),
    }).toEqual({
      closedState: 'false',
      opened: {
        items: rowItems,
        place: { left: '290px', top: '38px' },
        focus: 'Move to section',
        expanded: 'true',
      },
      pressedAgain: [],
      escaped: { items: [], focus: true },
      onBar: { browserMenu: true, items: [] },
      history: [open],
      requests: [],
    })
    expect(rowItems).toEqual([
      'Move to section >',
      'Reassign to >',
      'Rename',
      'Copy link',
      'Archive',
    ])
  })

  test('Rename puts the field in place of the name in the header, Escape keeps the name, Enter saves the new name in the header and in the row, and each close gives the focus back to the name', async () => {
    const server = new FakeApiServer()
    const { detail } = workspaceFixtures()
    const newName = 'Address autocomplete at checkout'
    server.json('PATCH', workspacePath(org, workspace), {
      ...detail,
      workspace: { ...detail.workspace, name: newName },
    })
    await openPaletteTab(open, { server })

    click(nameButton())
    click(menuItem('Rename'))
    press(byRole('textbox', 'Workspace name', header()), 'Escape')
    await settle()
    const escaped = {
      field: queryByRole('textbox', 'Workspace name'),
      focus: document.activeElement === nameButton(),
    }

    click(nameButton())
    click(menuItem('Rename'))
    const field = byRole('textbox', 'Workspace name', header())
    if (!(field instanceof HTMLInputElement)) throw new Error('No field.')
    const opened = {
      value: field.value,
      selection: [field.selectionStart, field.selectionEnd],
      focus: document.activeElement === field,
      title: header().querySelector('h1'),
    }
    typeText(field, ` ${newName} `)
    press(field, 'Enter')
    await settle()

    expect({
      escaped,
      opened,
      writes: await nameWrites(server),
      field: queryByRole('textbox', 'Workspace name'),
      title: title().textContent,
      row: rowLink(workspace).textContent?.includes(newName),
      focus: document.activeElement === nameButton(newName),
    }).toEqual({
      escaped: { field: null, focus: true },
      opened: {
        value: name,
        selection: [0, name.length],
        focus: true,
        title: null,
      },
      writes: [{ name: newName }],
      field: null,
      title: newName,
      row: true,
      focus: true,
    })
  })

  test('a right click on the name of an open menu closes it, and the next press by the keys opens it again', async () => {
    await openPaletteTab(open)
    const button = nameButton()
    click(button)
    const opened = menuOf(name).length
    // A right click: the press closes the menu, and no click follows.
    act(() => {
      for (const type of ['pointerdown', 'pointerup']) {
        button.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            button: 2,
            pointerType: 'mouse',
          }),
        )
      }
    })
    rightClick(button)
    await settle()
    const closed = menuOf(name)
    // Enter on a button clicks it, with no pointer press.
    click(button)

    expect({ opened, closed, reopened: menuOf(name).length }).toEqual({
      opened: 5,
      closed: [],
      reopened: 5,
    })
  })
})
