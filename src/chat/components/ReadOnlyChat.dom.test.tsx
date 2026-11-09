// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { nameLabel } from '../../shared/name-label'
import { createApiClient } from '../../app/api/client'
import { ServicesContext } from '../../app/services'
import { testServices } from '../../app/test-kit'
import { orgRefusal, SandboxBar } from '../../shell/workspace/SandboxNotice'
import type { Action } from '../../shell/ui/useAction'
import {
  byRole,
  queryAllByRole,
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
  typeText,
  waitFor,
} from '../../test-support/mount'
import { ChatController } from '../state/controller'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat, WorkspaceChatView } from '../WorkspaceChat'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The tab of the session with this title is the one that the chat shows. */
const isShownTab = (title: string) =>
  queryAllByRole('button', title).some(
    (tab) => tab.getAttribute('aria-current') === 'page',
  )

const writes = (server: FakeApiServer) =>
  server.requests
    .filter((request) => request.method !== 'GET')
    .map((request) => `${request.method} ${new URL(request.url).pathname}`)

/** An action that the refused bar never runs, because it offers none. */
const noResume: Action<[]> = {
  run: () => undefined,
  pending: false,
  error: null,
  reset: () => undefined,
}

describe('a read-only chat', () => {
  it('shows the refused bar of the host for a suspended org, switches its sessions with no write, and shows no control that writes', async () => {
    holdAnimationFrames()
    // The cloud computer still runs while its stop waits, so the chat would
    // show its composer without the read-only input.
    const server = new FakeApiServer({ workspaceState: 'ready' })
    const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message))
    const fixtures = workspaceFixtures('ready')
    const { workspace } = fixtures.detail
    const second = nameLabel(fixtures.sessions.sessions[1].title)
    await mount(
      <ServicesContext.Provider value={testServices(server)}>
        <WorkspaceChat
          client={createApiClient(server.fetch)}
          host={{
            starting: null,
            sandboxBar: (
              <SandboxBar
                notice={orgRefusal}
                resume={noResume}
                workspace={workspace}
              />
            ),
            keepsComposer: false,
          }}
          orgId={FAKE_IDS.org}
          readOnly
          subscribe={subscribe}
          viewport="desktop"
          workspaceId={FAKE_IDS.workspace}
        />
      </ServicesContext.Provider>,
    )
    await waitFor(
      () => queryByText(orgRefusal.reason),
      'the refused bar of the host',
    )
    await press(byRole('button', second))
    await waitFor(
      () => isShownTab(second),
      'the second session as the shown tab',
    )
    expect({
      refused: queryByText("The sandbox can't start") !== null,
      composer: document.querySelector('textarea') !== null,
      newSession: queryByRole('button', 'New session') !== null,
      rename: queryByRole('button', `Rename ${second}`) !== null,
      resume: queryByRole('button', 'Resume') !== null,
      writes: writes(server),
    }).toEqual({
      refused: true,
      composer: false,
      newSession: false,
      rename: false,
      resume: false,
      writes: [],
    })
  })

  it('keeps the old tab name when host access becomes read-only during a rename', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'ready' })
    const client = createApiClient(server.fetch)
    const services = testServices(server)
    const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message))
    const { workspace } = workspaceFixtures('ready').detail
    const render = (readOnly: boolean) => (
      <ServicesContext.Provider value={services}>
        <WorkspaceChat
          client={client}
          clock={{ now: () => FAKE_TIME }}
          host={
            readOnly
              ? {
                  starting: null,
                  sandboxBar: (
                    <SandboxBar
                      notice={orgRefusal}
                      resume={noResume}
                      workspace={workspace}
                    />
                  ),
                  keepsComposer: false,
                }
              : undefined
          }
          orgId={FAKE_IDS.org}
          readOnly={readOnly}
          subscribe={subscribe}
          viewport="desktop"
          workspaceId={FAKE_IDS.workspace}
        />
      </ServicesContext.Provider>
    )
    const view = await mount(render(false))
    await press(
      await waitFor(
        () => queryByRole('button', 'Rename Address autocomplete'),
        'the rename control before access changes',
      ),
    )
    await typeText(byRole('textbox', 'Session name'), 'Unsaved session name')

    await view.rerender(render(true))

    expect({
      rename: queryByRole('textbox', 'Session name') !== null,
      oldName: isShownTab('Address autocomplete'),
      composer: queryByRole('textbox', 'Message') !== null,
      refused: queryByText(orgRefusal.reason) !== null,
      writes: writes(server),
    }).toEqual({
      rename: false,
      oldName: true,
      composer: false,
      refused: true,
      writes: [],
    })
  })

  it('hides an open close question after an archive and keeps session history available without writes', async ({
    onTestFinished,
  }) => {
    holdAnimationFrames()
    const server = new FakeApiServer({
      workspaceState: 'working',
      conversation: 'running',
    })
    const controller = new ChatController({
      target: { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace },
      client: createApiClient(server.fetch),
      subscribe: (_target, after, listener) =>
        server.events.subscribe(after, (message) => listener.message(message)),
    })
    onTestFinished(controller.stop)
    await controller.start()
    await mount(
      <WorkspaceChatView
        clock={{ now: () => FAKE_TIME }}
        controller={controller}
        viewport="desktop"
      />,
    )
    await press(byRole('button', 'Close Address autocomplete'))
    expect(
      queryByRole('dialog', 'Stop the turn and close the tab?'),
    ).not.toBeNull()
    const { workspace } = workspaceFixtures('archived').detail

    await act(async () =>
      server.events.emit({
        workspaceId: FAKE_IDS.workspace,
        eventNumber: server.events.history().throughEventNumber + 1,
        occurredAt: FAKE_TIME,
        event: { type: 'workspace.updated', workspace },
      }),
    )

    expect({
      close: queryByRole('dialog', 'Stop the turn and close the tab?') !== null,
      tab: isShownTab('Address autocomplete'),
      composer: queryByRole('textbox', 'Message') !== null,
      overlay: controller.getSnapshot().overlay,
      notice: controller.getSnapshot().notice,
    }).toEqual({
      close: false,
      tab: true,
      composer: false,
      overlay: { kind: 'close', sessionId: FAKE_IDS.session },
      notice: null,
    })
    await press(byRole('button', 'Session history'))
    const history = byRole('menu', 'Session history')
    expect(
      queryByText(
        'Why does the places proxy time out on slow networks?',
        history,
      ),
    ).not.toBeNull()
    expect(writes(server)).toEqual([])
  })
})
