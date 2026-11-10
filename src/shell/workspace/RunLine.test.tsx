// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import {
  workspaceViewPath,
  type WorkspaceViewResponse,
} from '../../shared/workspace-view'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
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

/** The view reply of a run workspace of the routine. */
function runView(
  routine: NonNullable<WorkspaceViewResponse['routine']>,
): WorkspaceViewResponse {
  return { ...workspaceFixtures().view, routine }
}

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
  test('a pull request run links to its routine and to its pull request under the header', async () => {
    const server = new FakeApiServer()
    const url = 'https://github.com/acme/storefront/pull/482'
    server.json(
      'GET',
      workspaceViewPath(org, id),
      runView({
        id: 'review-prs',
        name: 'Review pull requests',
        pullRequest: { number: 482, url },
      }),
    )
    const { navigation, view } = await openWorkspace(server)
    const link = await waitFor(
      () => queryByRole('link', 'Routine: Review pull requests', view),
      'the link to the routine',
    )
    const pullRequest = byRole('link', 'Pull request #482 on GitHub', view)
    const shown = {
      line: link.closest('p')?.textContent,
      routine: link.getAttribute('href'),
      pullRequest: {
        href: pullRequest.getAttribute('href'),
        target: pullRequest.getAttribute('target'),
        rel: pullRequest.getAttribute('rel'),
      },
    }
    await press(link)
    expect({ ...shown, address: navigation.href() }).toEqual({
      line: 'Run of Review pull requests for #482',
      routine: '/orgs/acme/routines/review-prs',
      pullRequest: { href: url, target: '_blank', rel: 'noreferrer' },
      address: '/orgs/acme/routines/review-prs',
    })
  })

  test('a run of a schedule links to its routine only', async () => {
    const server = new FakeApiServer()
    server.json(
      'GET',
      workspaceViewPath(org, id),
      runView({
        id: 'error-triage',
        name: 'Triage new errors',
        pullRequest: null,
      }),
    )
    const { view } = await openWorkspace(server)
    const link = await waitFor(
      () => queryByRole('link', 'Routine: Triage new errors', view),
      'the link to the routine',
    )
    expect(link.closest('p')?.textContent).toBe('Run of Triage new errors')
  })

  test('a workspace that a person created has no line of a run', async () => {
    const { view } = await openWorkspace(new FakeApiServer())
    expect(queryByText('Run of', view)).toBeNull()
  })
})
