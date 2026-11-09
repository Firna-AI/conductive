// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../app/api/client'
import type { WorkspaceEvent } from '../../shared/events'
import { sessionPaths } from '../../shared/sessions'
import {
  workspacePath,
  type WorkspaceStart,
  type WorkspaceState,
} from '../../shared/workspaces'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  typeText,
  waitFor,
} from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const messages = sessionPaths.messages(org, ws, FAKE_IDS.session)
const saved =
  'The cloud computer did not start within the 20-minute limit. Try again.'

const workspaceIn = (state: WorkspaceState) => ({
  ...workspaceFixtures().detail.workspace,
  state,
})

/** A start whose one step failed: a create, or a resume. */
const failedStart = (kind: WorkspaceStart['kind']): WorkspaceStart => ({
  kind,
  startedAt: FAKE_TIME,
  steps: [
    {
      id: 'image',
      label: 'Starting from the cloud computer of Acme',
      state: 'failed',
      startedAt: FAKE_TIME,
      completedAt: FAKE_TIME,
    },
  ],
})

/** A Firna button marks itself with `aria-disabled`, a native one with `disabled`. */
const blocked = (element: Element) =>
  element.getAttribute('aria-disabled') === 'true' ||
  element.hasAttribute('disabled')

describe('the chat of a new workspace without a host', () => {
  it('sends with Send and Enter during the first start and after it failed, shows the saved cause above the composer, and keeps the bar of a failed resume in its place', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ conversation: 'queued' })
    // The read holds the state before the events that the test sends.
    server.json('GET', workspacePath(org, ws), {
      workspace: workspaceIn('starting'),
      start: { kind: 'create', startedAt: FAKE_TIME, steps: [] },
      error: null,
      eventNumber: 0,
    })
    const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message))
    const emit = (event: WorkspaceEvent) =>
      act(async () =>
        server.events.emit({
          workspaceId: ws,
          eventNumber: server.events.history().throughEventNumber + 1,
          occurredAt: FAKE_TIME,
          event,
        }),
      )
    const sends = () =>
      server.requests.filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === messages,
      )
    await mount(
      <WorkspaceChat
        client={createApiClient(server.fetch)}
        orgId={org}
        subscribe={subscribe}
        viewport="desktop"
        workspaceId={ws}
      />,
    )

    const box = await waitFor(
      () => queryByRole('textbox', 'Message'),
      'the message box',
    )
    await typeText(box, 'Keep a saved cart for 30 days.')
    expect(blocked(byRole('button', 'Send'))).toBe(false)
    await pressKey('Enter')
    await waitFor(() => sends().length === 1, 'the send during the start')

    await emit({
      type: 'workspace.updated',
      workspace: workspaceIn('error'),
      error: { code: 'workspace_start_failed', message: saved },
    })
    await emit({ type: 'start.updated', start: failedStart('create') })
    await waitFor(
      () => queryByText(`${saved} Your chat is saved.`),
      'the saved cause of the failed first start',
    )
    expect(queryByRole('button', 'Try again')).not.toBeNull()
    expect(queryByRole('textbox', 'Message')).not.toBeNull()
    await typeText(byRole('textbox', 'Message'), 'Add an index on the user ID.')
    await press(byRole('button', 'Send'))
    await waitFor(() => sends().length === 2, 'the send after the failure')

    await emit({ type: 'start.updated', start: failedStart('resume') })
    await waitFor(
      () => queryByText(`${saved} Your files and chat are saved.`),
      'the saved cause of the failed resume',
    )
    expect(queryByRole('textbox', 'Message')).toBeNull()
    expect(
      await Promise.all(
        sends().map(async (request) => (await request.clone().json()).text),
      ),
    ).toEqual([
      'Keep a saved cart for 30 days.',
      'Add an index on the user ID.',
    ])
  })
})
