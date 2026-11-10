// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { routinePaths } from '../../shared/routines'
import { workspacesPath } from '../../shared/workspaces'
import { queryByRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { bodiesOf, openApp, runRows } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The link of the run that Run now started. */
const started = 'Open the workspace of Run now'

/** Run now of the page, once the page shows it. */
function runNow(view: HTMLElement) {
  return waitFor(() => queryByRole('button', 'Run now', view), 'Run now')
}

describe('Run now', () => {
  test('starts a run, which shows first in the Runs list as Starting, with the link to its workspace', async () => {
    const server = new FakeApiServer()
    const { view } = await openApp(server, routes.routine(org, 'error-triage'))
    const before = await runRows(view)
    const listReads = () =>
      server.requests.filter(
        (request) =>
          request.method === 'GET' &&
          new URL(request.url).pathname === workspacesPath(org),
      ).length
    const reads = listReads()
    await press(await runNow(view))
    const link = await waitFor(
      () => queryByRole('link', started, view),
      'the run of Run now',
    )
    // The new run workspace joins the workspace list at once.
    await waitFor(() => listReads() > reads, 'a read of the workspace list')
    const sent = await bodiesOf(
      server,
      'POST',
      routinePaths.runNow(org, 'error-triage'),
    )
    expect({
      rows: await runRows(view),
      href: link.getAttribute('href'),
      sent,
    }).toEqual({
      rows: ['Run now now Starting', ...before],
      href: '/orgs/acme/workspaces/error-triage-run-now',
      sent: [{ requestId: expect.any(String) }],
    })
  })

  test('shows for the owner of a routine with a schedule, also while it is off, and for no one else', async () => {
    const shown = async (role: 'admin' | 'member', routineId: string) => {
      const server = new FakeApiServer({ role })
      const { view } = await openApp(server, routes.routine(org, routineId))
      await waitFor(
        () => queryByText('Routine', view),
        `the page of ${routineId}`,
      )
      await runRows(view)
      const button = queryByRole('button', 'Run now', view) !== null
      view.remove()
      return button
    }
    expect({
      offOwner: await shown('admin', 'error-triage'),
      pullRequestOwner: await shown('admin', 'review-prs'),
      member: await shown('member', 'error-triage'),
    }).toEqual({ offOwner: true, pullRequestOwner: false, member: false })
  })

  test('a phone opens the Runs tab, where the new run shows first', async () => {
    const { view, navigation } = await openApp(
      new FakeApiServer(),
      routes.routine(org, 'error-triage'),
      'phone',
    )
    await press(await runNow(view))
    await waitFor(
      () => queryByRole('link', started, view),
      'the run of Run now on the Runs tab',
    )
    expect({
      address: navigation.href(),
      first: (await runRows(view))[0],
    }).toEqual({
      address: routes.routine(org, 'error-triage', 'runs'),
      first: 'Run now now Starting',
    })
  })
})
