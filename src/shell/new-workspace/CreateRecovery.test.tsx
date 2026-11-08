// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import type { WorkspaceEvent } from '../../shared/events'
import {
  workspacePaths,
  workspacesPath,
  type WorkspaceStart,
  type WorkspaceState,
} from '../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import {
  away,
  bodiesOf,
  draftOf,
  emit,
  headerName,
  here,
  id,
  lastEvent,
  messageField,
  mountTab,
  org,
  recordingSocket,
} from '../workspace/kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { created, detail } = workspaceFixtures()
const createdId = created.workspace.id

/** An event of the created workspace, with its own event number. */
function createdEvent(event: WorkspaceEvent, server: FakeApiServer) {
  const envelope = {
    workspaceId: createdId,
    eventNumber: lastEvent(server) + 1,
    occurredAt: FAKE_TIME,
    event,
  }
  act(() => server.events.emit(envelope))
}

const createdState = (state: WorkspaceState): WorkspaceEvent => ({
  type: 'workspace.updated',
  workspace: { ...created.workspace, state },
})

/** The start of the create, with each running step in `state`. */
function createStart(state: 'failed' | 'completed'): WorkspaceStart {
  const start = created.start
  if (!start) throw new Error('The created workspace has no start.')
  const steps = start.steps.map((step) =>
    step.state === 'running'
      ? { ...step, state, completedAt: FAKE_TIME }
      : step,
  )
  return { ...start, steps }
}

const sidebar = (view: HTMLElement) =>
  view.querySelector('aside[aria-label="Workspaces"]')?.textContent ?? ''

describe('the first message of a create whose start fails', () => {
  test('goes back to its own form, also after a move away, and Try again makes another workspace', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const socket = recordingSocket(server)
    const app = await startedApp(server, { events: socket.source })
    const { view, go } = mountTab(app)
    await settle()
    go(routes.newWorkspace(org))
    await settle()
    typeText(messageField(view), 'Let shoppers save their cart.')
    const file = new File(['Cart notes'], 'notes.txt')
    await act(() => app.org(org).newWorkspace(null).attach([file]))
    click(byLabel('Send', view))
    await settle()
    expect(headerName(view)).toBe(created.workspace.name)
    const opened = socket.opens.length
    const before = server.requests.length

    createdEvent(createdState('error'), server)

    expect(view.textContent).toContain("The workspace wasn't created")
    expect(view.textContent).toContain(
      "Its sandbox didn't start. Your message is kept.",
    )
    expect(draftOf(view)).toBe('Let shoppers save their cart.')
    expect(queryByLabel('Remove postcode-overlap.png', view)).not.toBeNull()
    expect(queryByRole('button', 'Resume', view)).toBeNull()
    await settle()
    expect(socket.connected()).toBe(0)
    expect(socket.opens.length).toBe(opened)
    expect(requestLines(server).slice(before)).not.toContain(
      `POST ${workspacePaths.resume(org, createdId)}`,
    )
    expect(sidebar(view)).not.toContain(created.workspace.name)

    go(away)
    await settle()
    go(routes.workspace(org, createdId))
    await settle()
    expect(draftOf(view)).toBe('Let shoppers save their cart.')

    const retried = { ...created, workspace: { ...created.workspace, id } }
    server.json('POST', workspacesPath(org), retried, 201)
    click(byRole('button', 'Try again', view))
    await settle()
    const [first, retry] = await bodiesOf(
      server,
      'POST',
      workspacesPath(org),
      0,
    )
    expect(retry).toEqual(first)
    expect(headerName(view)).toBe(detail.workspace.name)
  })

  test('shows the message that the start saved, such as its time limit, in its own form', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
    })
    const { view, go } = mountTab(app)
    await settle()
    go(routes.newWorkspace(org))
    await settle()
    typeText(messageField(view), 'Let shoppers save their cart.')
    click(byLabel('Send', view))
    await settle()
    expect(headerName(view)).toBe(created.workspace.name)
    const passedLimit: WorkspaceEvent = {
      type: 'workspace.updated',
      workspace: { ...created.workspace, state: 'error' },
      error: {
        code: 'workspace_start_failed',
        message:
          'The cloud computer did not start within the 20-minute limit. Try again.',
      },
    }

    createdEvent(passedLimit, server)
    await settle()

    expect(view.textContent).toContain("The workspace wasn't created")
    expect(view.textContent).toContain(
      'The cloud computer did not start within the 20-minute limit. Try again. Your message is kept.',
    )
    expect(view.textContent).not.toContain("Its sandbox didn't start.")
    expect(draftOf(view)).toBe('Let shoppers save their cart.')
    expect(queryByRole('button', 'Try again', view)).not.toBeNull()
  })

  test('shows as not available in a tab that did not send it, and Resume and Try again stay for other starts', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
    })
    const { view, go } = mountTab(app)
    await settle()
    expect(queryByRole('button', 'Resume', view)).not.toBeNull()
    go(routes.workspace(org, createdId))
    await settle()
    expect(headerName(view)).toBe(created.workspace.name)

    // The server publishes the error state, then the failed step.
    createdEvent(createdState('error'), server)
    createdEvent(
      { type: 'start.updated', start: createStart('failed') },
      server,
    )

    expect(view.textContent).toContain('This workspace is not available')
    expect(view.textContent).toContain("Its sandbox didn't start.")
    expect(view.textContent).not.toContain('Your files and chat are saved.')
    expect(queryByRole('button', 'Try again', view)).toBeNull()
    expect(sidebar(view)).not.toContain(created.workspace.name)

    go(here)
    await settle()
    expect(queryByRole('button', 'Resume', view)).not.toBeNull()
    const broken: WorkspaceEvent = {
      type: 'workspace.updated',
      workspace: { ...detail.workspace, state: 'error' },
    }
    // A create that started keeps its start record. A later error of its
    // sandbox leaves the workspace in place, with Try again.
    const started = createStart('completed')
    emit(server, { type: 'start.updated', start: started })
    emit(server, broken)
    expect(queryByRole('button', 'Try again', view)).not.toBeNull()
    // A failed resume keeps Try again too.
    const resume: WorkspaceStart = {
      kind: 'resume',
      startedAt: FAKE_TIME,
      steps: [{ ...started.steps[0], state: 'failed' }],
    }
    emit(server, { type: 'start.updated', start: resume })
    emit(server, broken)
    expect(queryByRole('button', 'Try again', view)).not.toBeNull()
  })

  test('shows the message that the start saved in the not-available view of a tab that did not send it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
    })
    const { view, go } = mountTab(app)
    await settle()
    go(routes.workspace(org, createdId))
    await settle()
    expect(headerName(view)).toBe(created.workspace.name)
    const passedLimit: WorkspaceEvent = {
      type: 'workspace.updated',
      workspace: { ...created.workspace, state: 'error' },
      error: {
        code: 'workspace_start_failed',
        message:
          'The cloud computer did not start within the 20-minute limit. Try again.',
      },
    }

    // The server publishes the error state with its saved cause, then the
    // failed step.
    createdEvent(passedLimit, server)
    createdEvent(
      { type: 'start.updated', start: createStart('failed') },
      server,
    )
    await settle()

    expect(view.textContent).toContain('This workspace is not available')
    expect(view.textContent).toContain(
      'The cloud computer did not start within the 20-minute limit. Try again.',
    )
    expect(view.textContent).not.toContain("Its sandbox didn't start.")
    expect(queryByRole('button', 'All workspaces', view)).not.toBeNull()
    expect(queryByRole('button', 'Resume', view)).toBeNull()
    expect(queryByRole('button', 'Try again', view)).toBeNull()
  })
})
