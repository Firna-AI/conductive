// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { chatHistoryPath } from '../../shared/events'
import { sessionPaths, sessionsPath } from '../../shared/sessions'
import {
  workspaceViewPath,
  type WorkspaceTab,
} from '../../shared/workspace-view'
import {
  byRole,
  queryAllByRole,
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
  waitFor,
} from '../../test-support/mount'
import { acceptedIn, LINKED, linkedRecord } from '../state/linked-kit'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace

/** The tab of the session with this title is the one that the chat shows. */
const isShownTab = (title: string) =>
  queryAllByRole('button', title).some(
    (tab) => tab.getAttribute('aria-current') === 'page',
  )

/**
 * The fake of Priya: two linked sessions follow the open sessions. One comes
 * from the open first session, and one from a closed session. The view shows
 * the first linked session.
 */
function linkedServer() {
  const server = new FakeApiServer({ role: 'member' })
  const { sessions, view } = workspaceFixtures()
  const [closed] = sessions.history
  const linked = [
    linkedRecord(),
    linkedRecord({
      id: 'linked-2',
      title: 'Proxy follow-up',
      sourceSessionId: closed.id,
    }),
  ]
  server.json('GET', sessionsPath(org, ws), {
    sessions: [...sessions.sessions, ...linked],
    history: sessions.history,
  })
  const tabs: WorkspaceTab[] = [
    ...view.view.tabs,
    ...linked.map(({ id }) => ({ kind: 'session' as const, sessionId: id })),
  ]
  const activeTab: WorkspaceTab = { kind: 'session', sessionId: LINKED }
  server.json('GET', workspaceViewPath(org, ws), {
    view: { ...view.view, tabs, activeTab },
  })
  for (const session of linked) {
    const words = `Continue the work of ${session.sourceSessionId}.`
    const message = acceptedIn(session.id, `ask-${session.id}`, words)
    server.json('GET', chatHistoryPath(org, ws, session.id), {
      events: [
        {
          workspaceId: ws,
          eventNumber: 1_000,
          occurredAt: FAKE_TIME,
          event: { type: 'message.accepted', message },
        },
      ],
      throughEventNumber: 1_000,
    })
  }
  // The Worker reopens the closed source as an open session.
  server.json('POST', sessionPaths.reopen(org, ws, closed.id), {
    session: { ...closed, closedAt: null },
  })
  return { server, closed }
}

describe('the link of a linked session to its source', () => {
  it('opens the source session, and reopens a closed one from the history', async () => {
    holdAnimationFrames()
    const { server, closed } = linkedServer()
    const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message))
    await mount(
      <WorkspaceChat
        fetch={server.fetch}
        orgId={org}
        subscribe={subscribe}
        viewport="desktop"
        workspaceId={ws}
      />,
    )

    await waitFor(
      () => queryByText(`Continue the work of ${FAKE_IDS.session}.`),
      'the message of the linked session',
    )
    const line = queryByText('This session started from Address autocomplete')
    expect(line).not.toBeNull()
    await press(byRole('button', 'Address autocomplete', line ?? document))
    await waitFor(
      () => isShownTab('Address autocomplete'),
      'the source session as the shown tab',
    )

    await press(byRole('button', 'Proxy follow-up'))
    const closedLine = await waitFor(
      () => queryByText(`This session started from ${closed.title}`),
      'the line that links to the closed source',
    )
    await press(byRole('button', closed.title, closedLine))
    await waitFor(() => isShownTab(closed.title), 'the reopened source')
    const reopen = sessionPaths.reopen(org, ws, closed.id)
    const reopened = server.requests.filter(
      (request) =>
        request.method === 'POST' && new URL(request.url).pathname === reopen,
    )
    expect(reopened).toHaveLength(1)
  })
})
