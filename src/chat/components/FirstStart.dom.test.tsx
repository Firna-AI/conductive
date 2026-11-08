// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../app/api/client'
import type { WorkspaceEvent } from '../../shared/events'
import { sessionPaths } from '../../shared/sessions'
import { workspacePath, type WorkspaceState } from '../../shared/workspaces'
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
const reason = 'You can send when the sandbox is ready'
const words = 'Keep a saved cart for 30 days.'

const workspaceIn = (state: WorkspaceState) => ({
  ...workspaceFixtures().detail.workspace,
  state,
})

/** A Firna button marks itself with `aria-disabled`, a native one with `disabled`. */
const blocked = (element: Element) =>
  element.getAttribute('aria-disabled') === 'true' ||
  element.hasAttribute('disabled')

describe('the composer during the first start of a new workspace', () => {
  it('keeps the message while Send waits with its reason, ignores Enter, and sends only when the user asks after the start', async () => {
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
      server.events.emit({
        workspaceId: ws,
        eventNumber: server.events.history().throughEventNumber + 1,
        occurredAt: FAKE_TIME,
        event,
      })
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
    await typeText(box, words)
    expect(queryByText(reason)).not.toBeNull()
    expect(blocked(byRole('button', 'Send'))).toBe(true)
    await pressKey('Enter')
    expect(sends()).toHaveLength(0)

    await act(async () =>
      emit({ type: 'workspace.updated', workspace: workspaceIn('ready') }),
    )
    await waitFor(
      () => !blocked(byRole('button', 'Send')),
      'Send after the start',
    )
    expect(queryByText(reason)).toBeNull()
    expect(sends()).toHaveLength(0)
    expect(byRole('textbox', 'Message')).toHaveProperty('value', words)

    await pressKey('Enter')
    const [sent] = await waitFor(
      () => sends().length === 1 && sends(),
      'the send of the message',
    )
    expect(await sent.clone().json()).toMatchObject({ text: words })
  })
})
