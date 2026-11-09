// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
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
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import type { SubscribeToWorkspace } from '../stream/workspace-stream'
import { WorkspaceChat } from '../WorkspaceChat'
import { pointer, rowStatus } from './tab-drag-test-kit'
import { pressOn, rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The tab of the session with this title is the one that the chat shows. */
const isShownTab = (title: string) =>
  queryAllByRole('button', title).some(
    (tab) => tab.getAttribute('aria-current') === 'page',
  )

/** An action that the refused bar never runs, because it offers none. */
const noResume: Action<[]> = {
  run: () => undefined,
  pending: false,
  error: null,
  reset: () => undefined,
}

describe('a read-only chat', () => {
  it('shows the refused bar of the host for a suspended org, switches its sessions with no write, shows no control that writes, and opens no tab menu', async () => {
    holdAnimationFrames()
    // The cloud computer still runs while its stop waits, so the chat would
    // show its composer without the read-only input.
    const server = new FakeApiServer({ workspaceState: 'ready' })
    const subscribe: SubscribeToWorkspace = (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message))
    const { workspace } = workspaceFixtures('ready').detail
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
    await press(byRole('button', 'Debounce lookups'))
    await waitFor(
      () => isShownTab('Debounce lookups'),
      'the second session as the shown tab',
    )
    const mouse = { pointerType: 'mouse' }
    pointer(byRole('button', 'Debounce lookups'), 'pointerdown', {
      ...mouse,
      clientX: 50,
    })
    pointer(window, 'pointermove', { ...mouse, clientX: 90 })
    const drag = rowStatus()
    pointer(window, 'pointerup', { ...mouse, clientX: 90, buttons: 0 })
    const tab = byRole('button', 'Debounce lookups')
    const tabMenu = {
      browserMenu: rightClick(tab, { clientX: 50, clientY: 15 }),
      keyReachesBrowser: pressOn(tab, 'F10', { shiftKey: true }),
      menus: queryAllByRole('menu', 'Debounce lookups').length,
    }
    expect({
      refused: queryByText("The sandbox can't start") !== null,
      composer: document.querySelector('textarea') !== null,
      newSession: queryByRole('button', 'New session') !== null,
      tabMenu,
      resume: queryByRole('button', 'Resume') !== null,
      drag,
      writes: server.requests
        .filter((request) => request.method !== 'GET')
        .map((request) => `${request.method} ${new URL(request.url).pathname}`),
    }).toEqual({
      refused: true,
      composer: false,
      newSession: false,
      tabMenu: { browserMenu: true, keyReachesBrowser: true, menus: 0 },
      resume: false,
      drag: '',
      writes: [],
    })
  })
})
