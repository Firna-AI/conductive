import { act } from 'react'
import type { FetchLike } from '../../app/api/client'
import { fileMark } from '../../app/draft-marks'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { routes } from '../../app/router'
import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type NewWorkspaceView,
} from '../../shared/account'
import type { OrgRole } from '../../shared/api'
import { workspacesPath } from '../../shared/workspaces'
import { byLabel, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import {
  asMessageField,
  isMessageField,
  pressInField,
} from '../../test-support/message-field'
import { holdAnimationFrames } from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { here, org, recordingSocket } from '../workspace/kept-test-kit'

// The helpers of the tests of New workspace as a dialog or as a page.

/**
 * The fake API, where the user chose how New workspace opens. `role` is the
 * role of the user in the orgs, and `account` changes the account reply,
 * such as to disconnect an agent.
 */
export function serverWith(
  view: NewWorkspaceView,
  options: {
    role?: OrgRole
    account?: (account: AccountResponse) => AccountResponse
  } = {},
): FakeApiServer {
  const role = options.role ?? 'admin'
  const server = new FakeApiServer({ role })
  const account = { ...coreFixtures(role).account, newWorkspaceView: view }
  server.json(
    'GET',
    ACCOUNT_PATHS.account,
    options.account ? options.account(account) : account,
  )
  return server
}

/**
 * The whole app in a tab at `at`, the workspace by default, on a memory
 * address bar that the test moves. `fetch` stands between the app and the
 * fake API, such as the fetch of `HeldRequests`.
 */
export async function openTab(
  server: FakeApiServer,
  options: { at?: string; viewport?: Viewport; fetch?: FetchLike } = {},
) {
  holdAnimationFrames()
  const app = await startedApp(server, {
    events: recordingSocket(server).source,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
  const navigation = memoryNavigation(options.at ?? here)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport: options.viewport },
  )
  await settle()
  return {
    app,
    view,
    address: () => navigation.href(),
    /** The address changes, as with a link or Back. */
    go: async (to: string) => {
      act(() => navigation.push(to))
      await settle()
    },
  }
}

/** The New workspace dialog of the tab, or null. */
export const dialogIn = (view: HTMLElement) =>
  queryByRole('dialog', 'New workspace', view)

/** The open dialog. It fails when no dialog shows. */
export function openDialog(view: HTMLElement): HTMLElement {
  const dialog = dialogIn(view)
  if (!dialog) throw new Error('No New workspace dialog shows.')
  return dialog
}

/**
 * The org and the section that the dialog names on its Section menu, such
 * as "Acme · General".
 */
export function placeOf(dialog: HTMLElement): string | undefined {
  const menu = dialog.querySelector('[aria-label^="Section: "]')
  return menu?.textContent ?? undefined
}

/** The list beside the main area, which holds the row and the sections. */
export function sidebarOf(view: HTMLElement): HTMLElement {
  const sidebar = view.querySelector<HTMLElement>(
    'aside[aria-label="Workspaces"]',
  )
  if (!sidebar) throw new Error('The tab shows no sidebar.')
  return sidebar
}

/** The row New workspace at the top of a list: the sidebar, or the page. */
export function newWorkspaceRow(root: HTMLElement): HTMLElement {
  const row = root.querySelector<HTMLElement>(
    `a[href="${routes.newWorkspace(org)}"]`,
  )
  if (!row) throw new Error('The list has no New workspace row.')
  return row
}

/** The message field of a form: in the dialog, or in the main area. */
export function messageIn(root: HTMLElement): HTMLElement {
  return asMessageField(byLabel('Message', root))
}

/** The main area of the tab, beside the sidebar. */
export function mainOf(view: HTMLElement): HTMLElement {
  const main = view.querySelector('main')
  if (!main) throw new Error('The tab has no main area.')
  return main
}

/** Whether the focus is on `area` or inside it. */
export const focusIn = (area: HTMLElement) =>
  area.contains(document.activeElement)

/**
 * Presses a key on an element, as the keyboard does. The result says
 * whether the browser's own action was stopped. A message field commits
 * its change through its public test helper.
 */
export function keyDown(target: Element, init: KeyboardEventInit): boolean {
  if (isMessageField(target)) {
    return pressInField(target, init.key ?? '', init).defaultPrevented
  }
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event.defaultPrevented
}

/** The number of create requests that the server got. */
export const createCount = (server: FakeApiServer) =>
  server.requests.filter(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname === workspacesPath(org),
  ).length

/**
 * The mark of the file of the draft with this name, as the draft text holds
 * it at the chip of the file, or a stand-in that names a missing file.
 */
export function markOf(model: NewWorkspaceModel, name: string): string {
  const { files, detached } = model.draft.get()
  const item = [...files, ...detached].find(({ file }) => file.name === name)
  return item ? fileMark(item.id) : `<no file ${name}>`
}
