// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import type { WorkspaceEventSource } from '../../app/events'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { MODELS_PATH } from '../../shared/agents'
import { API_PATHS, boatKeyPath, orgPath } from '../../shared/api'
import type { WorkspaceEvent } from '../../shared/events'
import { membersPath } from '../../shared/members'
import { workspacePath, workspacePaths } from '../../shared/workspaces'
import {
  byLabel,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUsers,
} from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import {
  nextEnvelope,
  refusedReport,
} from '../../test-support/recorded-repairs'
import { Shell } from '../Shell'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const here = routes.workspace(org, id)
const away = routes.org(org)
const answer =
  'The checkout form now suggests addresses. Manual entry still works.'
const nameLost = 'The new workspace name is unavailable'

/**
 * The event socket of the app over the fake server. It records the event
 * number after which each subscription of the workspace opened, and counts
 * the subscriptions that are open now.
 */
function recordingSocket(server: FakeApiServer) {
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

function emit(server: FakeApiServer, event: WorkspaceEvent) {
  act(() => server.events.emit(nextEnvelope(server.events, event, FAKE_TIME)))
}

/** The number of the newest stored event of the workspace. */
const lastEvent = (server: FakeApiServer) =>
  server.events.history(Number.MAX_SAFE_INTEGER).throughEventNumber

/** The whole app in a tab, on a memory address bar that the test moves. */
function mountTab(app: AppModel) {
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
function chatRequests(server: FakeApiServer, from: number): string[] {
  const shared = [MODELS_PATH, ACCOUNT_PATHS.account, orgPath(org)]
  const others = [...shared, membersPath(org), boatKeyPath(org)]
  return requestLines(server)
    .slice(from)
    .filter(
      (line) =>
        line.includes(workspacePath(org, id)) ||
        others.some((path) => line === `GET ${path}`),
    )
}

/** The notices under the workspace header, each as its text and its age. */
function notices(view: HTMLElement): string[] {
  const bars = view.querySelectorAll('header ~ [role="status"]')
  return Array.from(bars, (node) =>
    Array.from(node.children, (part) => part.textContent ?? '')
      .filter((text) => text !== '')
      .join(' '),
  )
}

/** The text field of the composer. */
function messageField(view: HTMLElement): HTMLTextAreaElement {
  const field = byLabel('Message', view)
  if (!(field instanceof HTMLTextAreaElement)) {
    throw new Error('The composer has no text field.')
  }
  return field
}

const draftOf = (view: HTMLElement) => messageField(view).value
const headerName = (view: HTMLElement) =>
  view.querySelector('header h1')?.textContent

describe('a workspace that the tab showed', () => {
  test('shows at once on a return, and each socket asks only for the events after its last one', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    emit(server, refusedReport('workspace.title', true))
    const held = new HeldRequests(server)
    const socket = recordingSocket(server)
    const app = await startedApp(server, {
      fetch: held.fetch,
      events: socket.source,
    })
    const { view, go } = mountTab(app)
    await settle()
    typeText(messageField(view), 'Keep this draft')
    click(byLabel('Dismiss', view))
    const first = socket.opens.length
    go(away)
    await settle()
    expect(socket.connected()).toBe(0)
    const kept = lastEvent(server)
    const { sessions } = workspaceFixtures().sessions
    emit(server, { type: 'workspace.title', name: 'Saved addresses' })
    emit(server, {
      type: 'session.updated',
      session: { ...sessions[0], title: 'Address lookups' },
    })
    const before = server.requests.length
    held.hold('POST', workspacePaths.open(org, id))

    go(here)

    // The kept workspace shows while its open waits.
    expect(headerName(view)).toBe(workspaceFixtures().detail.workspace.name)
    expect(view.textContent).toContain(answer)
    expect(draftOf(view)).toBe('Keep this draft')
    expect(notices(view)).toEqual([`${nameLost} now`])
    await act(async () => held.release('POST', workspacePaths.open(org, id)))
    await settle()
    expect(socket.opens.slice(first)).toEqual([kept, kept])
    expect(chatRequests(server, before)).toEqual([
      `POST ${workspacePaths.open(org, id)}`,
    ])
    expect(headerName(view)).toBe('Saved addresses')
    expect(queryByRole('button', 'Address lookups', view)).not.toBeNull()
    // The name came in a full report, so the failed repair is over.
    expect(notices(view)).toEqual([])
  })

  test('opens no socket of the chat while away, also when its first load ends then', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const socket = recordingSocket(server)
    const app = await startedApp(server, {
      fetch: held.fetch,
      events: socket.source,
    })
    held.holdAnswer('GET', workspacePath(org, id))
    const { view, go } = mountTab(app)
    await settle()
    go(away)
    await settle()
    const opened = [...socket.opens]
    await act(async () => held.release('GET', workspacePath(org, id)))
    await settle()
    expect(socket.opens).toEqual(opened)
    expect(socket.connected()).toBe(0)
    go(here)
    await settle()
    expect(view.textContent).toContain(answer)
    expect(socket.opens.slice(opened.length)).not.toContain(0)
  })

  test('waits for its own open on a return after an open that failed', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, {
      fetch: held.fetch,
      events: recordingSocket(server).source,
    })
    const open = workspacePaths.open(org, id)
    const busy = { error: { code: 'internal_error', message: 'Busy.' } }
    server.json('POST', open, busy, 500)
    const { view, go } = mountTab(app)
    await settle()
    expect(view.textContent).toContain("The workspace didn't open")
    go(away)
    await settle()
    server.json('POST', open, workspaceFixtures().detail)
    held.hold('POST', open)
    go(here)
    expect(view.textContent).not.toContain("The workspace didn't open")
    expect(queryByLabel('Opening the workspace', view)).not.toBeNull()
    await act(async () => held.release('POST', open))
    await settle()
    expect(headerName(view)).toBe(workspaceFixtures().detail.workspace.name)
  })

  test('starts empty in a new tab of the app', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const first = recordingSocket(server)
    const tab = mountTab(await startedApp(server, { events: first.source }))
    await settle()
    typeText(messageField(tab.view), 'Only in the first tab')
    const before = server.requests.length
    const second = recordingSocket(server)
    const other = mountTab(await startedApp(server, { events: second.source }))
    await settle()
    expect(draftOf(other.view)).toBe('')
    expect(second.opens[0]).toBe(0)
    expect(chatRequests(server, before)).toContain(
      `GET ${workspacePath(org, id)}`,
    )
  })

  test('is forgotten at a sign-out and when another person signs in', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const socket = recordingSocket(server)
    const app = await startedApp(server, { events: socket.source })
    const { view } = mountTab(app)
    await settle()
    typeText(messageField(view), 'A draft of the first person')
    await act(() => app.account.signOut())
    expect(app.boot.get().state).toBe('signed-out')
    const signedOut = socket.opens.length
    await act(() => app.start())
    await settle()
    expect(draftOf(view)).toBe('')
    expect(socket.opens.slice(signedOut)).toContain(0)
    typeText(messageField(view), 'A draft before another person')
    server.json('GET', API_PATHS.session, { user: fakeUsers[1] })
    await act(() => app.start())
    await settle()
    expect(draftOf(view)).toBe('')
  })
})
