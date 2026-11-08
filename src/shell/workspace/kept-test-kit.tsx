import { act } from 'react'
import type { AppModel } from '../../app/app-model'
import type { WorkspaceEventSource } from '../../app/events'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { MODELS_PATH } from '../../shared/agents'
import { orgPath } from '../../shared/api'
import type { WorkspaceEvent } from '../../shared/events'
import { githubPaths } from '../../shared/github'
import { membersPath } from '../../shared/members'
import { terminalPaths } from '../../shared/terminal'
import { workspacePath } from '../../shared/workspaces'
import { byLabel } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { nextEnvelope } from '../../test-support/recorded-repairs'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'

// The helpers of the tests of the workspaces that a tab keeps.

export const { org, workspace: id } = FAKE_IDS
export const here = routes.workspace(org, id)
export const away = routes.org(org)
export const answer =
  'The checkout form now suggests addresses. Manual entry still works.'

/**
 * The event socket of the app over the fake server. It records the event
 * number after which each subscription of the workspace opened, and counts
 * the subscriptions that are open now.
 */
export function recordingSocket(server: FakeApiServer) {
  const opens: number[] = []
  let connected = 0
  const source: WorkspaceEventSource = {
    open: (target, handlers) => {
      opens.push(target.afterEventNumber)
      connected += 1
      const close = server.events.subscribe(
        target.afterEventNumber,
        handlers.message,
      )
      return () => {
        connected -= 1
        close()
      }
    },
  }
  return { source, opens, connected: () => connected }
}

export function emit(server: FakeApiServer, event: WorkspaceEvent) {
  act(() => server.events.emit(nextEnvelope(server.events, event, FAKE_TIME)))
}

/** The number of the newest stored event of the workspace. */
export const lastEvent = (server: FakeApiServer) =>
  server.events.history(Number.MAX_SAFE_INTEGER).throughEventNumber

/** The whole app in a tab, on a memory address bar that the test moves. */
export function mountTab(app: AppModel) {
  const navigation = memoryNavigation(here)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  const go = (to: string) => act(() => navigation.push(to))
  return { view, go }
}

/** The reads and writes of the workspace and of the chat's other routes. */
export function chatRequests(server: FakeApiServer, from: number): string[] {
  const shared = [MODELS_PATH, ACCOUNT_PATHS.account, orgPath(org)]
  const others = [...shared, membersPath(org)]
  return requestLines(server)
    .slice(from)
    .filter(
      (line) =>
        line.includes(workspacePath(org, id)) ||
        others.some((path) => line === `GET ${path}`),
    )
}

/**
 * The reads of a return to a kept workspace, in path order: the terminal and
 * the GitHub bar read their state again, as at each show, and the model
 * reads the workspace. The chat and the files read nothing again. The parts
 * read on their own, so the order in which they read is not fixed.
 */
export const returnReads = [
  `GET ${terminalPaths.connection(org, id)}`,
  `GET ${githubPaths.banner(org, id)}`,
  `GET ${githubPaths.checks(org, id)}`,
  `GET ${workspacePath(org, id)}`,
].sort()

/** The JSON bodies of the requests with this method and path, from `from` on. */
export function bodiesOf(
  server: FakeApiServer,
  method: string,
  path: string,
  from: number,
): Promise<unknown[]> {
  const chosen = server.requests
    .slice(from)
    .filter(
      (request) =>
        request.method === method && new URL(request.url).pathname === path,
    )
  return Promise.all(chosen.map((request) => request.clone().json()))
}

/** The notices under the workspace header, each as its text and its age. */
export function notices(view: HTMLElement): string[] {
  const bars = view.querySelectorAll('header ~ [role="status"]')
  return Array.from(bars, (node) =>
    Array.from(node.children, (part) => part.textContent ?? '')
      .filter((text) => text !== '')
      .join(' '),
  )
}

/** The text field of the composer. */
export function messageField(view: HTMLElement): HTMLTextAreaElement {
  const field = byLabel('Message', view)
  if (!(field instanceof HTMLTextAreaElement)) {
    throw new Error('The composer has no text field.')
  }
  return field
}

export const draftOf = (view: HTMLElement) => messageField(view).value

export const headerName = (view: HTMLElement) =>
  view.querySelector('header h1')?.textContent

/** The text field with this label, as a person finds it by its name. */
export function fieldNamed(view: HTMLElement, label: string): HTMLInputElement {
  const field = Array.from(view.querySelectorAll('input')).find((item) => {
    const labelledBy = item.getAttribute('aria-labelledby')
    const name = labelledBy
      ? document.getElementById(labelledBy)?.textContent
      : item.getAttribute('aria-label')
    return name === label
  })
  if (!field) throw new Error(`No field has the label "${label}".`)
  return field
}

/** Whether a control is off, so that a press does nothing. */
export const isOff = (control: HTMLElement) =>
  control.hasAttribute('disabled') ||
  control.getAttribute('aria-disabled') === 'true'
