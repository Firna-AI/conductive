// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { here, org } from '../workspace/kept-test-kit'
import {
  createCount,
  dialogIn,
  keyDown,
  mainOf,
  messageIn,
  newWorkspaceRow,
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
    const kept = keyDown(messageIn(tab.view), { key: 'Enter' })
    await settle()
    expect({
      dialog: dialogIn(tab.view),
      address: tab.address(),
      kept,
      creates: createCount(server),
    }).toEqual({
      dialog: null,
      address: routes.newWorkspace(org),
      kept: false,
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
})
