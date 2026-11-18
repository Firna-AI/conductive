// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { workspacePath, workspacePaths } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { queryByLabel, queryByRole } from '../../test-support/dom-queries'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { HeldRequests } from '../../app/test-kit'
import type { AppModel } from '../../app/app-model'
import { mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { WorkspaceScreen } from './WorkspaceScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const resumePath = workspacePaths.resume(FAKE_IDS.org, FAKE_IDS.workspace)

/** The workspace screen of the fake workspace, alone. */
function mountWorkspace(
  app: AppModel,
  options: { viewport?: Viewport; view?: readonly string[] } = {},
): HTMLElement {
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!org) throw new Error('The fake org is missing.')
  return mountScreen(
    app,
    <WorkspaceScreen
      org={org}
      view={options.view ?? []}
      viewer={fakeUser}
      workspaceId={FAKE_IDS.workspace}
    />,
    { viewport: options.viewport ?? 'desktop' },
  )
}

/** A stopped workspace whose Resume answers only at `release`. */
async function openStopped(
  options: { viewport?: Viewport; view?: readonly string[] } = {},
) {
  // The spinner of the wait animates without end.
  holdAnimationFrames()
  const server = new FakeApiServer({ workspaceState: 'stopped' })
  const held = new HeldRequests(server)
  held.holdAnswer('POST', resumePath)
  const container = mountWorkspace(
    await startedApp(server, { fetch: held.fetch }),
    options,
  )
  await settle()
  return {
    container,
    release: async () => {
      held.release('POST', resumePath)
      await settle()
    },
  }
}

describe('SandboxBar', () => {
  test('the open of a stopped workspace shows the composer, Starting, the saved lists, and waiting tools, not the stopped bar, while its Resume runs', async () => {
    const { container, release } = await openStopped()
    const header = () => container.querySelector('header')?.textContent
    const text = () => container.textContent
    expect(queryByRole('button', 'Resume', container)).toBeNull()
    expect(queryByLabel('Message', container)).not.toBeNull()
    expect(header()).toContain('Starting')
    expect(header()).not.toContain('Stopped')
    expect(text()).toContain('Waiting for the sandbox')
    expect(text()).not.toContain('Sandbox stopped')
    expect(text()).toContain('5 files changed')

    // The fake keeps the sandbox stopped after its Resume, so the bar shows
    // once the open ends.
    await release()
    expect(queryByRole('button', 'Resume', container)).not.toBeNull()
    expect(queryByLabel('Message', container)).toBeNull()
    expect(header()).toContain('Stopped')
    expect(text()).toContain('Sandbox stopped')
    expect(text()).toContain('5 files changed')
  })

  test('on a phone, the Terminal tab waits with no Resume while the open resumes the sandbox', async () => {
    const { container, release } = await openStopped({
      viewport: 'phone',
      view: ['terminal'],
    })
    expect(container.textContent).toContain('Waiting for the sandbox')
    expect(queryByRole('button', 'Resume', container)).toBeNull()

    await release()
    expect(container.textContent).toContain('Sandbox stopped')
    expect(queryByRole('button', 'Resume', container)).not.toBeNull()
  })

  test('a start that failed shows the message that the workspace saved for it, with Try again', async () => {
    const server = new FakeApiServer({ workspaceState: 'error' })
    const { detail } = workspaceFixtures('error')
    server.json('GET', workspacePath(FAKE_IDS.org, FAKE_IDS.workspace), {
      ...detail,
      error: {
        code: 'workspace_start_failed',
        message:
          'The cloud computer did not start within the 20-minute limit. Try again.',
        log: null,
      },
    })
    server.json(
      'POST',
      resumePath,
      { error: { code: 'workspace_start_failed', message: 'Try again.' } },
      503,
    )
    const container = mountWorkspace(await startedApp(server))
    await settle()
    const bars = Array.from(container.querySelectorAll('[role="alert"]'))
    expect(bars.map((bar) => textOf(bar.innerHTML))).toEqual([
      "The sandbox couldn't start The cloud computer did not start within the 20-minute limit. Try again. Your files and chat are saved. Try again",
    ])
  })
})
