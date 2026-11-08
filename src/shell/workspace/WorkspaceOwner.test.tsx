// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { workspaceOwnerPath } from '../../shared/members'
import { queryByRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const priya = fakeUsers[1]

/**
 * The whole app on a phone at the open workspace. A phone opens the owner
 * menu as a sheet, which happy-dom can show.
 */
function mountWorkspace(app: AppModel) {
  return mountScreen(
    app,
    <NavigationContext.Provider
      value={memoryNavigation(routes.workspace(org, id))}
    >
      <Shell />
    </NavigationContext.Provider>,
    { viewport: 'phone' },
  )
}

describe('the owner in the header of a workspace', () => {
  test('an admin picks another owner, and the header and the list of the org show the answer', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { workspace } = workspaceFixtures().detail
    const path = workspaceOwnerPath(org, id)
    server.json('PUT', path, { workspace: { ...workspace, owner: priya } })
    const app = await startedApp(server)
    // The list of the org loaded before, as when the user came from it.
    await app.org(org).reload('list')
    const view = mountWorkspace(app)
    const owner = await waitFor(
      () => queryByRole('button', 'Owner: Cal', view),
      'the owner menu of the header',
    )
    await press(owner)
    await press(
      await waitFor(
        () => queryByRole('menuitemradio', 'Priya Raman'),
        'the choice of Priya Raman',
      ),
    )
    await waitFor(
      () => queryByRole('button', 'Owner: Priya Raman', view),
      'the new owner in the header',
    )
    const put = server.requests.find((request) => request.method === 'PUT')
    expect({
      request: put && {
        path: new URL(put.url).pathname,
        body: await put.text(),
      },
      listed: app.org(org).workspace(id)?.owner.id,
    }).toEqual({
      request: { path, body: '{"userId":"priya"}' },
      listed: 'priya',
    })
  })

  test('in a suspended org its admin sees the owner without the menu', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const view = mountWorkspace(await startedApp(server))
    const header = await waitFor(
      () => view.querySelector('header'),
      'the header of the workspace',
    )
    expect({
      owner: queryByText('Cal, owner of the workspace', header)?.textContent,
      menu: queryByRole('button', 'Owner: Cal', header),
    }).toEqual({ owner: 'Cal, owner of the workspace', menu: null })
  })

  test('a member who is not an admin sees the owner without the menu', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer({ role: 'member' }))
    const view = mountWorkspace(app)
    const header = await waitFor(
      () => view.querySelector('header'),
      'the header of the workspace',
    )
    expect({
      owner: queryByText('Cal, owner of the workspace', header)?.textContent,
      menu: queryByRole('button', 'Owner: Cal', header),
    }).toEqual({ owner: 'Cal, owner of the workspace', menu: null })
  })
})
