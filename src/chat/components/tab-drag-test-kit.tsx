import { act } from 'react'
import { createApiClient } from '../../app/api/client'
import {
  workspaceViewPath,
  type WorkspaceTab,
} from '../../shared/workspace-view'
import { byLabel, queryByText } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { holdAnimationFrames, mount, waitFor } from '../../test-support/mount'
import { readView } from '../api/read-responses'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'
import type { RenderTab } from './tab-row'

// The helpers of the tests that drag the tabs of the mounted chat.

const viewPath = workspaceViewPath(FAKE_IDS.org, FAKE_IDS.workspace)

/** The session tab of "Address autocomplete", which the chat shows. */
export const first: WorkspaceTab = {
  kind: 'session',
  sessionId: FAKE_IDS.session,
}
/** The session tab of "Debounce lookups". */
export const second: WorkspaceTab = { kind: 'session', sessionId: 'debounce' }
/** The file tab of "app.ts". */
export const file: WorkspaceTab = {
  kind: 'file',
  path: 'src/app.ts',
  mode: 'source',
}

/** Mounts the chat of the fake workspace, whose saved view holds `tabs`. */
export async function mountChat(options: {
  server: FakeApiServer
  tabs: readonly WorkspaceTab[]
  viewport: 'desktop' | 'mobile'
  renderTab?: RenderTab
}) {
  holdAnimationFrames()
  const { server } = options
  const view = { tabs: options.tabs, activeTab: first }
  server.json('GET', viewPath, {
    view: { ...view, fileList: 'changes', tool: 'terminal' },
  })
  const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
    server.events.subscribe(after, (message) => listener.message(message))
  await mount(
    <WorkspaceChat
      client={createApiClient(server.fetch)}
      orgId={FAKE_IDS.org}
      renderTab={options.renderTab}
      subscribe={subscribe}
      viewport={options.viewport}
      workspaceId={FAKE_IDS.workspace}
    />,
  )
  await waitFor(() => queryByText('Debounce lookups'), 'the session tabs')
}

/** Gives the list item of each tab a box 100 px wide, in this order. */
export function layOut(...tabs: HTMLElement[]) {
  tabs.forEach((tab, index) => {
    const item = tab.closest('li')
    if (!item) throw new Error(`The tab ${tab.textContent} has no list item.`)
    const box = new DOMRect(index * 100, 0, 100, 30)
    Object.defineProperty(item, 'getBoundingClientRect', {
      configurable: true,
      value: () => box,
    })
  })
}

/** Sends a pointer event with the primary button down, unless `init` says otherwise. */
export function pointer(
  target: EventTarget,
  type: string,
  init: PointerEventInit,
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
        buttons: 1,
        clientY: 15,
        ...init,
      }),
    )
  })
}

/** What the status of the tab row tells a screen reader. */
export function rowStatus(): string {
  const row = byLabel('Sessions and files')
  return row.querySelector('[role="status"]')?.textContent ?? ''
}

/** The titles of the tabs of the row, in their order on the page. */
export function rowTitles(): string[] {
  const row = byLabel('Sessions and files')
  return Array.from(row.querySelectorAll('li'), (item) => item.textContent)
}

/** The title of the tab that shows as the current one. */
export function shownTab(): string | null {
  return document.querySelector('[aria-current="page"]')?.textContent ?? null
}

/** Whether a lifted copy of the tab shows above the page, outside the row. */
export function liftedCopy(title: string): boolean {
  return Array.from(document.querySelectorAll('[aria-hidden="true"]')).some(
    (node) => node.closest('nav') === null && node.textContent === title,
  )
}

/** The view saves that the fake API got. */
export const viewSaves = (server: FakeApiServer) =>
  server.requests.filter(
    (request) =>
      request.method === 'PUT' && new URL(request.url).pathname === viewPath,
  )

/** The tab orders of the view saves, through the reader of the chat. */
export function savedOrders(server: FakeApiServer): Promise<WorkspaceTab[][]> {
  return Promise.all(
    viewSaves(server).map(async (request) => [
      ...readView({ view: await request.clone().json() }).tabs,
    ]),
  )
}

/** Lets the replies of the fake API and their renders run. */
export async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
