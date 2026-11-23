// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { orgSettingsPaths } from '../../shared/org-settings'
import { workspacesPath } from '../../shared/workspaces'
import { queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { removedWorkspace } from '../../test-support/fixtures/removed-workspace'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the page of an org', () => {
  test('asks for the first workspace when the list holds only a removed workspace', async () => {
    const server = new FakeApiServer()
    server.json('GET', workspacesPath(FAKE_IDS.org), {
      workspaces: [removedWorkspace()],
      repositories: [
        {
          id: 'selected',
          fullName: 'acme/from-list',
          defaultBranch: 'trunk',
          selected: true,
        },
      ],
    })
    const app = await startedApp(server)
    const navigation = memoryNavigation(routes.org(FAKE_IDS.org))
    const view = mountScreen(app, <Shell />, { navigation })
    await settle()
    const main = view.querySelector('main') ?? view
    expect({
      first: queryByText('Start the first workspace in Acme', main) !== null,
      choose: queryByText('Choose a workspace', main) !== null,
    }).toEqual({ first: true, choose: false })
    expect(main.textContent).toContain('acme/from-list')
    expect(requestLines(server)).not.toContain(
      `GET ${orgSettingsPaths.repositories(FAKE_IDS.org)}`,
    )
  })
})
