// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import {
  automationsPath,
  type AutomationsResponse,
} from '../../shared/automations'
import {
  byRole,
  queryAllByRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { openApp, wordsOf } from './automation-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** Each row of the Automations list: its words, and the address of its link. */
function rowsOf(list: HTMLElement) {
  return Array.from(list.querySelectorAll('li'), (row) => ({
    words: wordsOf(row),
    to: row.querySelector('a')?.getAttribute('href') ?? null,
  }))
}

/** The sidebar of the org, with New workspace, Automations, and the sections. */
function sidebarOf(view: HTMLElement): HTMLElement | null {
  return view.querySelector<HTMLElement>('aside[aria-label="Workspaces"]')
}

const automationWords =
  'An automation runs a saved prompt on a schedule or on a pull request event, each time in a new workspace.'

describe('the Automations page', () => {
  test('the Automations link of the sidebar opens the page, which lists the automations of the API with a link to each', async () => {
    const server = new FakeApiServer()
    const { navigation, view } = await openApp(server, routes.org(org))
    const link = await waitFor(() => {
      const sidebar = sidebarOf(view)
      return sidebar && queryByRole('link', 'Automations', sidebar)
    }, 'the Automations link of the sidebar')
    await press(link)
    const list = await waitFor(
      () => queryByRole('list', 'Automations', view),
      'the automations of Acme',
    )
    expect({
      address: navigation.href(),
      current: link.getAttribute('aria-current'),
      title: view.querySelector('main h1')?.textContent,
      about: queryByText(automationWords, view) !== null,
      newAutomation: queryAllByRole('button', 'New automation', view).length,
      rows: rowsOf(list),
    }).toEqual({
      address: routes.automations(org),
      current: 'page',
      title: 'Automations',
      about: true,
      newAutomation: 1,
      rows: [
        {
          words:
            'Review pull requests acme/storefront · PR opened, PR pushed Last run: Working, now By Cal Active',
          to: routes.automation(org, 'review-prs'),
        },
        {
          words:
            'Triage new errors acme/billing-service · Hourly at minute 15 Last run: Failed, 5m By Cal Off 3 failed runs',
          to: routes.automation(org, 'error-triage'),
        },
        {
          words:
            'Weekly dependency updates acme/storefront · Weekly on Monday at 08:00 Last run: Ready, 3d By Priya Raman Active',
          to: routes.automation(org, 'dependency-updates'),
        },
        {
          words:
            'Update the changelog acme/marketing-site · PR merged Last run: Archived, 6d By Jonas Weber Off',
          to: routes.automation(org, 'changelog'),
        },
        {
          words:
            'Check the site copy acme/marketing-site · Weekly on Friday at 16:00 Last run: Stopped, 14d By Cal Off',
          to: routes.automation(org, 'copy-review'),
        },
      ],
    })
  })

  test('the Automations link of the phone list opens the page of an org without automations, which says what an automation does and offers one New automation', async () => {
    const server = new FakeApiServer()
    server.json('GET', automationsPath(org), {
      automations: [],
    } satisfies AutomationsResponse)
    const { navigation, view } = await openApp(server, routes.org(org), 'phone')
    const link = await waitFor(
      () => queryByRole('link', 'Automations', view),
      'the Automations link of the list',
    )
    await press(link)
    await waitFor(
      () => queryByText('Create the first automation in Acme', view),
      'the empty Automations page',
    )
    expect({
      address: navigation.href(),
      about: queryByText(automationWords, view) !== null,
      newAutomation: queryAllByRole('button', 'New automation', view).length,
      back: queryByRole('button', 'Workspaces', view) !== null,
      list: queryByRole('list', 'Automations', view),
    }).toEqual({
      address: routes.automations(org),
      about: true,
      newAutomation: 1,
      back: true,
      list: null,
    })
  })

  test('a suspended org keeps its Automations link, and its page shows the notice of the org and the automations without New automation', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { view } = await openApp(server, routes.automations(org))
    const list = await waitFor(
      () => queryByRole('list', 'Automations', view),
      'the automations of the suspended Acme',
    )
    const sidebar = sidebarOf(view)
    const main = view.querySelector('main')
    if (!sidebar || !main) throw new Error('The desktop frame is not drawn.')
    expect({
      automations: byRole('link', 'Automations', sidebar).getAttribute(
        'aria-current',
      ),
      newWorkspace: queryByRole('link', 'New workspace', sidebar),
      notice: wordsOf(main).includes(
        'Acme is suspended Its workspaces and settings are read-only.',
      ),
      newAutomation: queryAllByRole('button', 'New automation', view).length,
      rows: rowsOf(list).map((row) => row.to),
      writes: requestLines(server).filter((line) => !line.startsWith('GET ')),
    }).toEqual({
      automations: 'page',
      newWorkspace: null,
      notice: true,
      newAutomation: 0,
      rows: [
        routes.automation(org, 'review-prs'),
        routes.automation(org, 'error-triage'),
        routes.automation(org, 'dependency-updates'),
        routes.automation(org, 'changelog'),
        routes.automation(org, 'copy-review'),
      ],
      writes: [],
    })
  })
})
