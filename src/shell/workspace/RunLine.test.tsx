// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { workspaceViewPath } from '../../shared/workspace-view'
import { queryByRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The answer of the recorded chat, which shows once the chat loaded. */
const answer =
  'The checkout form now suggests addresses. Manual entry still works.'

/** The whole app at the open workspace. */
async function openWorkspace(server: FakeApiServer) {
  holdAnimationFrames()
  const app = await startedApp(server)
  const navigation = memoryNavigation(routes.workspace(org, id))
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  await waitFor(() => queryByText(answer, view), 'the loaded chat')
  return { navigation, view }
}

describe('the header of a workspace', () => {
  test('a run workspace links to its routine under the header', async () => {
    const server = new FakeApiServer()
    server.json('GET', workspaceViewPath(org, id), {
      ...workspaceFixtures().view,
      routine: { id: 'review-prs', name: 'Review pull requests' },
    })
    const { navigation, view } = await openWorkspace(server)
    const link = await waitFor(
      () => queryByRole('link', 'Routine: Review pull requests', view),
      'the link to the routine',
    )
    const line = link.closest('p')?.textContent
    const href = link.getAttribute('href')
    await press(link)
    expect({ line, href, address: navigation.href() }).toEqual({
      line: 'Run of Review pull requests',
      href: '/orgs/acme/routines/review-prs',
      address: '/orgs/acme/routines/review-prs',
    })
  })

  test('a workspace that a person created has no line of a run', async () => {
    const { view } = await openWorkspace(new FakeApiServer())
    expect(queryByText('Run of', view)).toBeNull()
  })
})
