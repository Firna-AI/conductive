// @vitest-environment happy-dom

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

/** The bodies of the writes of the name of the open workspace. */
async function nameWrites(server: FakeApiServer): Promise<unknown[]> {
  const path = workspacePath(org, workspace)
  const writes = server.requests.filter(
    (request) => request.method === 'PATCH' && request.url.endsWith(path),
  )
  return Promise.all(writes.map((request) => request.json()))
}

describe('the workspace menu in the header', () => {
  test('a right click on the bar opens the menu of the row of the open workspace at the pointer, a right click on a control of the bar opens none, and Escape closes it with no request', async () => {
    const { server, navigation } = await openPaletteTab(open)
    rightClick(rowLink(workspace), { clientX: 120, clientY: 300 })
    const rowItems = menuOf(name)
    press(document.activeElement ?? document.body, 'Escape')
    const from = requestLines(server).length

    const browserMenu = rightClick(title(), { clientX: 200, clientY: 20 })
    const opened = {
      browserMenu,
      items: menuOf(name),
      place: menuPlace(name),
      focus: focusName(),
    }
    press(document.activeElement ?? document.body, 'Escape')
    const closed = menuOf(name)
    const control = byRole('button', 'Hide the right column', header())
    const onControl = {
      browserMenu: rightClick(control, { clientX: 900, clientY: 20 }),
      items: menuOf(name),
    }
    rightClick(header(), { clientX: 600, clientY: 20 })
    const onBar = menuOf(name)
    press(document.activeElement ?? document.body, 'Escape')
    // The main area holds the focus for a new screen with a `tabindex`, as
    // after a create. It is no control of the header.
    const area = header().parentElement
    area?.setAttribute('tabindex', '-1')
    rightClick(title(), { clientX: 200, clientY: 20 })
    const inFocusedArea = menuOf(name)
    press(document.activeElement ?? document.body, 'Escape')
    area?.removeAttribute('tabindex')
    await settle()

    expect({
      opened,
      closed,
      onControl,
      onBar,
      inFocusedArea,
      history: navigation.history,
      requests: requestsFor(server, workspace, from),
    }).toEqual({
      opened: {
        browserMenu: false,
        items: rowItems,
        place: { left: '200px', top: '20px' },
        focus: 'Move to section',
      },
      closed: [],
      onControl: { browserMenu: true, items: [] },
      onBar: rowItems,
      inFocusedArea: rowItems,
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

  test('Rename puts the field in place of the name in the header, and Enter saves the new name in the header and in the row', async () => {
    const server = new FakeApiServer()
    const { detail } = workspaceFixtures()
    const newName = 'Address autocomplete at checkout'
    server.json('PATCH', workspacePath(org, workspace), {
      ...detail,
      workspace: { ...detail.workspace, name: newName },
    })
    await openPaletteTab(open, { server })

    rightClick(title(), { clientX: 200, clientY: 20 })
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
      opened,
      writes: await nameWrites(server),
      field: queryByRole('textbox', 'Workspace name'),
      title: title().textContent,
      row: rowLink(workspace).textContent?.includes(newName),
    }).toEqual({
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
    })
  })
})
