// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { workspacesPath } from '../../shared/workspaces'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByText,
} from '../../test-support/dom-queries'
import { messageText } from '../../test-support/message-field'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { bodiesOf, here, org } from '../workspace/kept-test-kit'
import {
  createCount,
  dialogIn,
  keyDown,
  mainOf,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  placeOf,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Each place of New workspace, pressed as a person presses it. */
const places = {
  row: (view: HTMLElement) => click(newWorkspaceRow(sidebarOf(view))),
  button: (view: HTMLElement) =>
    click(byRole('button', 'New workspace', mainOf(view))),
  menu: (view: HTMLElement) => {
    click(byLabel('More for Checkout', sidebarOf(view)))
    click(byRole('menuitem', 'New workspace', sidebarOf(view)))
  },
}

describe('the places of New workspace', () => {
  test.each([
    {
      view: 'dialog',
      opens: 'the dialog over the screen',
      expected: {
        row: { dialog: 'Acme · General', address: routes.org(org) },
        button: { dialog: 'Acme · General', address: routes.org(org) },
        menu: { dialog: 'Acme · Checkout', address: routes.org(org) },
      },
    },
    {
      view: 'page',
      opens: 'the page',
      expected: {
        row: { dialog: null, address: routes.newWorkspace(org) },
        button: { dialog: null, address: routes.newWorkspace(org) },
        menu: { dialog: null, address: routes.newWorkspace(org, 'checkout') },
      },
    },
  ] as const)(
    'with the $view choice, each place opens $opens, in its section',
    async ({ view, expected }) => {
      const tab = await openTab(serverWith(view), { at: routes.org(org) })
      const seen: Record<string, unknown> = {}
      for (const [name, open] of Object.entries(places)) {
        open(tab.view)
        await settle()
        const dialog = dialogIn(tab.view)
        seen[name] = {
          dialog: dialog ? placeOf(dialog) : null,
          address: tab.address(),
        }
        if (dialog) press(messageIn(dialog), 'Escape')
        await tab.go(routes.org(org))
      }
      expect(seen).toEqual(expected)
    },
  )

  test('a phone opens the page with the dialog chosen, and Enter adds a line there', async () => {
    const server = serverWith('dialog')
    const tab = await openTab(server, {
      at: routes.org(org),
      viewport: 'phone',
    })
    click(newWorkspaceRow(tab.view))
    await settle()
    typeText(messageIn(tab.view), 'Let shoppers save their cart.')
    // The field adds the line itself, so it keeps the key from the browser.
    const kept = keyDown(messageIn(tab.view), { key: 'Enter' })
    await settle()
    expect({
      dialog: dialogIn(tab.view),
      address: tab.address(),
      kept,
      text: messageText(messageIn(tab.view)),
      creates: createCount(server),
    }).toEqual({
      dialog: null,
      address: routes.newWorkspace(org),
      kept: true,
      text: 'Let shoppers save their cart.\n',
      creates: 0,
    })
  })

  test('the row stays a link for a click with a modifier key, and opens the page while the screen shows a New workspace form', async () => {
    const tab = await openTab(serverWith('dialog'))
    // The browser opens the address of a link that the app leaves alone.
    const opened = vi.spyOn(window, 'open').mockReturnValue(null)
    onTestFinished(() => opened.mockRestore())
    const withMeta = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    })
    act(() => {
      newWorkspaceRow(sidebarOf(tab.view)).dispatchEvent(withMeta)
    })
    await settle()
    const withKey = {
      dialog: dialogIn(tab.view),
      address: tab.address(),
      leftToBrowser: !withMeta.defaultPrevented,
    }
    await tab.go(routes.newWorkspace(org, 'checkout'))
    places.row(tab.view)
    await settle()
    expect({
      withKey,
      onForm: { dialog: dialogIn(tab.view), address: tab.address() },
    }).toEqual({
      withKey: { dialog: null, address: here, leftToBrowser: true },
      onForm: { dialog: null, address: routes.newWorkspace(org) },
    })
  })

  test('the Section menu of the dialog offers each section and no Archived group, and its pick names the section on the dialog and the page and creates the workspace there', async () => {
    const server = serverWith('dialog')
    const tab = await openTab(server, { at: routes.org(org) })
    places.row(tab.view)
    await settle()
    click(byRole('button', 'Section: General', openDialog(tab.view)))
    const menu = byRole('menu', 'Section', openDialog(tab.view))
    const offered = Array.from(
      menu.querySelectorAll('[role="menuitemradio"]'),
      (item) => accessibleName(item),
    )
    click(byRole('menuitemradio', 'Checkout', menu))
    await settle()
    const picked = placeOf(openDialog(tab.view))
    // The page of General shares the draft, so it names the pick too.
    press(messageIn(openDialog(tab.view)), 'Escape')
    await tab.go(routes.newWorkspace(org))
    const page = {
      dialog: dialogIn(tab.view),
      subtitle: queryByText('Acme · Checkout', tab.view) !== null,
    }
    await tab.go(routes.org(org))
    places.row(tab.view)
    await settle()
    typeText(messageIn(openDialog(tab.view)), 'Let shoppers save their cart.')
    click(byRole('button', 'Create', openDialog(tab.view)))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
    expect({ offered, picked, page, sent }).toEqual({
      offered: ['General', 'Checkout', 'Infra'],
      picked: 'Acme · Checkout',
      page: { dialog: null, subtitle: true },
      sent: expect.objectContaining({ sectionId: 'checkout' }),
    })
  })
})
