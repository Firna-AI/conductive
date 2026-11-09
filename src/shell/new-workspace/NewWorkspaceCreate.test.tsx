// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { FetchLike } from '../../app/api/client'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { workspacesPath } from '../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { away, bodiesOf, headerName, org } from '../workspace/kept-test-kit'
import {
  createCount,
  dialogIn,
  focusIn,
  keyDown,
  mainOf,
  messageIn,
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const task = 'Let shoppers save their cart.'
const unreachable = "The app can't reach the server. Your message is kept."
const { created } = workspaceFixtures()
const createdAt = routes.workspace(org, created.workspace.id)

describe('a create from the New workspace dialog', () => {
  test('that fails keeps the dialog with the message and Try again, and Try again creates the workspace in the section of the menu and opens it, whose main area takes the focus', async () => {
    const server = serverWith('dialog')
    let reachable = false
    // The create request does not reach the server until the test says so.
    const fetch: FetchLike = (input, init) => {
      const create =
        init?.method === 'POST' &&
        new URL(input, FAKE_ORIGIN).pathname === workspacesPath(org)
      if (create && !reachable) return Promise.reject(new TypeError('offline'))
      return server.fetch(input, init)
    }
    const tab = await openTab(server, { fetch })
    const more = byLabel('More for Checkout', sidebarOf(tab.view))
    click(more)
    click(byRole('menuitem', 'New workspace', sidebarOf(tab.view)))
    await settle()
    typeText(messageIn(openDialog(tab.view)), task)
    click(byRole('button', 'Create', openDialog(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    expect({
      title: queryByText("The workspace wasn't created", dialog) !== null,
      body: queryByText(unreachable, dialog) !== null,
      text: messageIn(dialog).value,
      tryAgain: queryByRole('button', 'Try again', dialog) !== null,
    }).toEqual({ title: true, body: true, text: task, tryAgain: true })
    reachable = true
    click(byRole('button', 'Try again', dialog))
    await settle()
    const [sent] = await bodiesOf(server, 'POST', workspacesPath(org), 0)
    expect({
      sent,
      dialog: dialogIn(tab.view),
      address: tab.address(),
      header: headerName(tab.view),
      focusBack: document.activeElement === more,
      focusInMain: focusIn(mainOf(tab.view)),
    }).toEqual({
      sent: expect.objectContaining({
        sectionId: 'checkout',
        firstMessage: expect.objectContaining({ text: task }),
      }),
      dialog: null,
      address: createdAt,
      header: 'Untitled',
      focusBack: false,
      focusInMain: true,
    })
  })

  test('goes on when the address changes while it runs, which closes the dialog and gives the focus to the main area of the new screen, also of Create org, and the accepted create opens the new workspace', async () => {
    const server = serverWith('dialog')
    const held = new HeldRequests(server)
    const tab = await openTab(server, { fetch: held.fetch })
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    typeText(messageIn(openDialog(tab.view)), task)
    held.hold('POST', workspacesPath(org))
    click(byRole('button', 'Create', openDialog(tab.view)))
    await settle()
    // While the create runs, Escape and a press outside keep the dialog.
    press(messageIn(openDialog(tab.view)), 'Escape')
    act(() => {
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      )
    })
    await settle()
    const running = dialogIn(tab.view) !== null
    await tab.go(away)
    const closed = {
      dialog: dialogIn(tab.view),
      address: tab.address(),
      focusInMain: focusIn(mainOf(tab.view)),
    }
    held.release('POST', workspacesPath(org))
    await settle()
    expect({
      running,
      closed,
      address: tab.address(),
      header: headerName(tab.view),
      creates: createCount(server),
    }).toEqual({
      running: true,
      closed: { dialog: null, address: away, focusInMain: true },
      address: createdAt,
      header: 'Untitled',
      creates: 1,
    })
    // Create org stands alone, without the rail, as after Back to it.
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const reopened = dialogIn(tab.view) !== null
    await tab.go(routes.createOrg())
    const main = tab.view.querySelector('main')
    expect({
      reopened,
      dialog: dialogIn(tab.view),
      address: tab.address(),
      focusInMain: main?.contains(document.activeElement) ?? false,
    }).toEqual({
      reopened: true,
      dialog: null,
      address: routes.createOrg(),
      focusInMain: true,
    })
  })
})

describe('the send key of New workspace', () => {
  test.each([
    {
      form: 'page',
      where: 'on the page',
      open: async (tab: Awaited<ReturnType<typeof openTab>>) => {
        await tab.go(routes.newWorkspace(org))
        return mainOf(tab.view)
      },
    },
    {
      form: 'dialog',
      where: 'in the dialog',
      open: async (tab: Awaited<ReturnType<typeof openTab>>) => {
        click(newWorkspaceRow(sidebarOf(tab.view)))
        await settle()
        return openDialog(tab.view)
      },
    },
  ] as const)(
    '$where, Enter creates the workspace, and Shift+Enter, Enter in an input method, and Enter with no message do not',
    async ({ form, open }) => {
      const server = serverWith(form)
      const tab = await openTab(server)
      const root = await open(tab)
      const field = messageIn(root)
      const keys = async (init: KeyboardEventInit) => {
        const kept = keyDown(field, { key: 'Enter', ...init })
        await settle()
        return { kept, creates: createCount(server) }
      }
      const empty = await keys({})
      typeText(field, task)
      const shift = await keys({ shiftKey: true })
      const composing = await keys({ isComposing: true })
      const enter = await keys({})
      expect({
        empty,
        shift,
        composing,
        enter,
        address: tab.address(),
      }).toEqual({
        empty: { kept: true, creates: 0 },
        shift: { kept: false, creates: 0 },
        composing: { kept: false, creates: 0 },
        enter: { kept: true, creates: 1 },
        address: createdAt,
      })
    },
  )
})
