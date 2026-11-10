// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { routinesPath, type RoutinesResponse } from '../../shared/routines'
import {
  byRole,
  queryAllByRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
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
import type { Viewport } from '../ui/viewport'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The words of the element as a screen reader reads them, one space apart. */
function wordsOf(element: Element): string {
  const words: string[] = []
  const walk = (node: Node) => {
    if (node instanceof Element && node.getAttribute('aria-hidden') === 'true')
      return
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) words.push(text)
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(element)
  return words.join(' ')
}

/** Each row of the Routines list: its words, and the address of its link. */
function rowsOf(list: HTMLElement) {
  return Array.from(list.querySelectorAll('li'), (row) => ({
    words: wordsOf(row),
    to: row.querySelector('a')?.getAttribute('href') ?? null,
  }))
}

/** The app at an address of Acme, with the address bar that the test reads. */
async function openApp(
  server: FakeApiServer,
  address: string,
  viewport: Viewport = 'desktop',
) {
  holdAnimationFrames()
  const app = await startedApp(server)
  const navigation = memoryNavigation(address)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport },
  )
  return { navigation, view }
}

/** The sidebar of the org, with New workspace, Routines, and the sections. */
function sidebarOf(view: HTMLElement): HTMLElement | null {
  return view.querySelector<HTMLElement>('aside[aria-label="Workspaces"]')
}

const routineWords =
  'A routine runs a saved prompt on a schedule or on a pull request event, each time in a new workspace.'

describe('the Routines page', () => {
  test('the Routines link of the sidebar opens the page, which lists the routines of the API with a link to each', async () => {
    const server = new FakeApiServer()
    const { navigation, view } = await openApp(server, routes.org(org))
    const link = await waitFor(() => {
      const sidebar = sidebarOf(view)
      return sidebar && queryByRole('link', 'Routines', sidebar)
    }, 'the Routines link of the sidebar')
    await press(link)
    const list = await waitFor(
      () => queryByRole('list', 'Routines', view),
      'the routines of Acme',
    )
    expect({
      address: navigation.href(),
      current: link.getAttribute('aria-current'),
      title: view.querySelector('main h1')?.textContent,
      about: queryByText(routineWords, view) !== null,
      newRoutine: queryAllByRole('button', 'New routine', view).length,
      rows: rowsOf(list),
    }).toEqual({
      address: routes.routines(org),
      current: 'page',
      title: 'Routines',
      about: true,
      newRoutine: 1,
      rows: [
        {
          words:
            'Review pull requests acme/storefront · PR opened, PR pushed Last run: Working, now By Cal Active',
          to: routes.routine(org, 'review-prs'),
        },
        {
          words:
            'Triage new errors acme/billing-service · Hourly at minute 15 Last run: Failed, 5m By Cal Off 3 failed runs',
          to: routes.routine(org, 'error-triage'),
        },
        {
          words:
            'Weekly dependency updates acme/storefront · Weekly on Monday at 08:00 Last run: Ready, 3d By Priya Raman Active',
          to: routes.routine(org, 'dependency-updates'),
        },
        {
          words:
            'Update the changelog acme/marketing-site · PR merged Last run: Archived, 6d By Jonas Weber Off',
          to: routes.routine(org, 'changelog'),
        },
        {
          words:
            'Check the site copy acme/marketing-site · Weekly on Friday at 16:00 Last run: Stopped, 14d By Cal Off',
          to: routes.routine(org, 'copy-review'),
        },
      ],
    })
  })

  test('the Routines link of the phone list opens the page of an org without routines, which says what a routine does and offers one New routine', async () => {
    const server = new FakeApiServer()
    server.json('GET', routinesPath(org), {
      routines: [],
    } satisfies RoutinesResponse)
    const { navigation, view } = await openApp(server, routes.org(org), 'phone')
    const link = await waitFor(
      () => queryByRole('link', 'Routines', view),
      'the Routines link of the list',
    )
    await press(link)
    await waitFor(
      () => queryByText('Create the first routine in Acme', view),
      'the empty Routines page',
    )
    expect({
      address: navigation.href(),
      about: queryByText(routineWords, view) !== null,
      newRoutine: queryAllByRole('button', 'New routine', view).length,
      back: queryByRole('button', 'Workspaces', view) !== null,
      list: queryByRole('list', 'Routines', view),
    }).toEqual({
      address: routes.routines(org),
      about: true,
      newRoutine: 1,
      back: true,
      list: null,
    })
  })

  test('a suspended org keeps its Routines link, and its page shows the notice of the org and the routines without New routine', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { view } = await openApp(server, routes.routines(org))
    const list = await waitFor(
      () => queryByRole('list', 'Routines', view),
      'the routines of the suspended Acme',
    )
    const sidebar = sidebarOf(view)
    const main = view.querySelector('main')
    if (!sidebar || !main) throw new Error('The desktop frame is not drawn.')
    expect({
      routines: byRole('link', 'Routines', sidebar).getAttribute(
        'aria-current',
      ),
      newWorkspace: queryByRole('link', 'New workspace', sidebar),
      notice: wordsOf(main).includes(
        'Acme is suspended Its workspaces and settings are read-only.',
      ),
      newRoutine: queryAllByRole('button', 'New routine', view).length,
      rows: rowsOf(list).map((row) => row.to),
      writes: requestLines(server).filter((line) => !line.startsWith('GET ')),
    }).toEqual({
      routines: 'page',
      newWorkspace: null,
      notice: true,
      newRoutine: 0,
      rows: [
        routes.routine(org, 'review-prs'),
        routes.routine(org, 'error-triage'),
        routes.routine(org, 'dependency-updates'),
        routes.routine(org, 'changelog'),
        routes.routine(org, 'copy-review'),
      ],
      writes: [],
    })
  })
})
