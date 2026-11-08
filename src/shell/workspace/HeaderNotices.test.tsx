// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import type { WorkspaceEventSource } from '../../app/events'
import type { WorkspaceEvent } from '../../shared/events'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { queryByRole } from '../../test-support/dom-queries'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import {
  fullReport,
  nextEnvelope,
  refusedReport,
} from '../../test-support/recorded-repairs'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { WorkspaceScreen } from './WorkspaceScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const minute = 60_000
const nameLost = 'The new workspace name is unavailable'
const stepsLost = 'The latest start steps are unavailable'

/** The event socket of the fake server, as the development fake opens it. */
function socketOf(server: FakeApiServer): WorkspaceEventSource {
  return {
    open: (target, handlers) =>
      server.events.subscribe(target.afterEventNumber, handlers.message),
  }
}

function emit(server: FakeApiServer, event: WorkspaceEvent, at = FAKE_TIME) {
  act(() => server.events.emit(nextEnvelope(server.events, event, at)))
}

/** A new tab of the app, signed in, over the fake server and its stream. */
function newTab(server: FakeApiServer): Promise<AppModel> {
  return startedApp(server, { events: socketOf(server) })
}

/** Mounts the workspace in a tab, and lets it open and read its history. */
async function openWorkspace(
  app: AppModel,
  view: readonly string[] = [],
  viewport: Viewport = 'desktop',
): Promise<HTMLElement> {
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!org) throw new Error('The fake org is missing.')
  const container = mountScreen(
    app,
    <WorkspaceScreen
      org={org}
      view={view}
      viewer={fakeUser}
      workspaceId={FAKE_IDS.workspace}
    />,
    { viewport },
  )
  await settle()
  return container
}

/** The notices under the header, each as its text and its age. */
function notices(container: HTMLElement): string[] {
  const texts: string[] = []
  let bar = container.querySelector('header')?.nextElementSibling ?? null
  while (bar?.getAttribute('role') === 'status') {
    const parts = Array.from(bar.children, (part) => part.textContent ?? '')
    texts.push(parts.filter((text) => text !== '').join(' '))
    bar = bar.nextElementSibling
  }
  return texts
}

/** The element that directly follows the workspace header. */
function belowHeader(container: HTMLElement): Element | null {
  return container.querySelector('header')?.nextElementSibling ?? null
}

function dismiss(container: HTMLElement): void {
  const button = container.querySelector<HTMLElement>(
    '[role="status"] [aria-label="Dismiss"]',
  )
  if (!button) throw new Error('No notice has Dismiss.')
  click(button)
}

describe('the notices of a failed repair under the workspace header', () => {
  test('show only after the fresh report is lost too, below the header on every phone tab', async () => {
    const server = new FakeApiServer()
    // A first loss asks for a fresh report and shows nothing. A marker of
    // a session belongs to the chat, not to the header.
    emit(
      server,
      refusedReport('workspace.title', false),
      FAKE_TIME - 9 * minute,
    )
    emit(server, {
      ...refusedReport('start.updated', true, 2),
      sessionId: FAKE_IDS.session,
      turnId: 'turn-1',
    })
    const app = await newTab(server)
    const files = await openWorkspace(app, ['files'], 'phone')
    expect(notices(files)).toEqual([])
    emit(
      server,
      refusedReport('workspace.title', true, 3),
      FAKE_TIME - 2 * minute,
    )
    expect(notices(files)).toEqual([`${nameLost} 2m ago`])
    expect(belowHeader(files)?.getAttribute('role')).toBe('status')
    for (const view of [['terminal'], []]) {
      const other = await openWorkspace(app, view, 'phone')
      expect(notices(other)).toEqual([`${nameLost} 2m ago`])
      expect(belowHeader(other)?.getAttribute('role')).toBe('status')
    }
    const desktop = await openWorkspace(app)
    expect(belowHeader(desktop)?.getAttribute('role')).toBe('status')
  })

  test('clear only with a newer full report of the same kind', async () => {
    const server = new FakeApiServer()
    const view = await openWorkspace(await newTab(server))
    emit(server, refusedReport('start.updated', true), FAKE_TIME - 3 * minute)
    emit(server, refusedReport('workspace.title', true), FAKE_TIME - minute)
    expect(notices(view)).toEqual([`${nameLost} 1m ago`, `${stepsLost} 3m ago`])
    emit(server, fullReport('start.updated'))
    expect(notices(view)).toEqual([`${nameLost} 1m ago`])
    const { workspace } = workspaceFixtures().detail
    emit(server, { type: 'workspace.updated', workspace })
    emit(server, fullReport('files.snapshot'))
    emit(server, fullReport('changes.updated'))
    expect(notices(view)).toEqual([`${nameLost} 1m ago`])
    emit(server, fullReport('workspace.title'))
    expect(notices(view)).toEqual([])
  })

  test('Dismiss hides a notice in this view only, until a full report of its kind clears the failure', async () => {
    const server = new FakeApiServer()
    const view = await openWorkspace(await newTab(server))
    emit(server, refusedReport('workspace.title', true), FAKE_TIME - 2 * minute)
    expect(notices(view)).toEqual([`${nameLost} 2m ago`])
    dismiss(view)
    expect(notices(view)).toEqual([])
    // A further loss of the same kind is the same failure.
    emit(server, refusedReport('workspace.title', true, 2))
    expect(notices(view)).toEqual([])
    // Dismiss changes nothing on the server: a new tab shows the failure.
    const tab = await openWorkspace(await newTab(server))
    expect(notices(tab)).toEqual([`${nameLost} 2m ago`])
    emit(server, fullReport('workspace.title'))
    expect(notices(tab)).toEqual([])
    // A failure after the full report shows again in the view that hid one.
    emit(server, refusedReport('workspace.title', true, 3), FAKE_TIME)
    expect(notices(view)).toEqual([`${nameLost} now`])
  })

  test('keep a failed repair when a reply of the workspace route arrives after it', async () => {
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    emit(server, refusedReport('workspace.title', true), FAKE_TIME)
    const view = await openWorkspace(await newTab(server))
    expect(
      server.requests.filter((request) => request.url.endsWith('/resume')),
    ).toHaveLength(1)
    expect(notices(view)).toEqual([`${nameLost} now`])
    // The reply of Resume holds the stored name, older than the lost one.
    const resume = queryByRole('button', 'Resume', view)
    if (!resume) throw new Error('The stopped workspace has no Resume.')
    click(resume)
    await settle()
    expect(
      server.requests.filter((request) => request.url.endsWith('/resume')),
    ).toHaveLength(2)
    expect(notices(view)).toEqual([`${nameLost} now`])
  })
})
