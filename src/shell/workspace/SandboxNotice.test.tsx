// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { workspacePaths } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { WorkspaceScreen } from './WorkspaceScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('SandboxBar', () => {
  test('a start that failed shows the message that the workspace saved for it, with Try again', async () => {
    const server = new FakeApiServer({ workspaceState: 'error' })
    const { detail } = workspaceFixtures('error')
    server.json('POST', workspacePaths.open(FAKE_IDS.org, FAKE_IDS.workspace), {
      ...detail,
      error: {
        code: 'workspace_start_failed',
        message:
          'The cloud computer did not start within the 20-minute limit. Try again.',
        log: null,
      },
    })
    const app = await startedApp(server)
    const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
    if (!org) throw new Error('The fake org is missing.')
    const container = mountScreen(
      app,
      <WorkspaceScreen
        org={org}
        view={[]}
        viewer={fakeUser}
        workspaceId={FAKE_IDS.workspace}
      />,
    )
    await settle()
    const bars = Array.from(container.querySelectorAll('[role="alert"]'))
    expect(bars.map((bar) => textOf(bar.innerHTML))).toEqual([
      "The sandbox couldn't start The cloud computer did not start within the 20-minute limit. Try again. Your files and chat are saved. Try again",
    ])
  })
})
