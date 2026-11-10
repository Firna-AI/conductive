// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { routes } from '../../app/router'
import { Store } from '../../app/store'
import { testServices } from '../../app/test-kit'
import { operatorOverviewPath } from '../../shared/operator'
import { byLabel } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import {
  operatorRequiredBody,
  serveOperator,
} from '../../test-support/operator'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { mountShell, operatorRequests, railOperator } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The rail of the orgs. */
function railOf(view: HTMLElement): HTMLElement {
  const rail = view.querySelector<HTMLElement>('nav[aria-label="Orgs"]')
  if (!rail) throw new Error('The page has no rail.')
  return rail
}

/** The names of the links of the rail, from the top. */
function railLinks(view: HTMLElement): (string | null)[] {
  return Array.from(view.querySelectorAll('nav[aria-label="Orgs"] a'), (link) =>
    link.getAttribute('aria-label'),
  )
}

describe('the access to the operator section', () => {
  test('an operator opens it from the rail, above the account, and the rail marks it as the current page', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.org('acme'))
    expect(railLinks(view)).toEqual([
      'Acme',
      'Futex',
      'Firna',
      'Create org',
      'Operator',
      'Account',
    ])
    click(byLabel('Operator', railOf(view)))
    await settle()
    expect({
      title: view.querySelector('main h1')?.textContent,
      current: railOperator(view)?.getAttribute('aria-current'),
    }).toEqual({ title: 'Operator', current: 'page' })
  })

  test('anyone else has no Operator in the rail, gets the not-found page at each operator address, and sends no operator request', async () => {
    const server = new FakeApiServer()
    const shown = []
    for (const href of [
      routes.operator(),
      routes.operatorOrgs('hexwave'),
      routes.operatorUser(SAMPLE_IDS.suspendedUser),
      routes.operatorProviders(),
    ]) {
      const { view } = await mountShell(server, href)
      shown.push({
        title: view.querySelector('main h2')?.textContent,
        rail: railLinks(view),
      })
    }
    const notFound = {
      title: 'This page is not available',
      rail: ['Acme', 'Futex', 'Firna', 'Create org', 'Account'],
    }
    expect(shown).toEqual([notFound, notFound, notFound, notFound])
    expect(await operatorRequests(server)).toEqual([])
  })

  test('an operator request that the API refuses shows the not-found page, and the rail drops Operator', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', operatorOverviewPath(), operatorRequiredBody, 403)
    const { view, text } = await mountShell(server, routes.operator())
    expect({
      page: text().includes('This page is not available'),
      rail: railOperator(view),
    }).toEqual({ page: true, rail: null })
  })

  test('opens in the Mac app without a sidebar, also after an org, with the sidebar toggle off', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveOperator(server)
    const window: MacWindow = {
      state: new Store<MacWindowState>({
        mode: 'window',
        canGoBack: false,
        canGoForward: false,
      }),
      back: () => undefined,
      forward: () => undefined,
    }
    const app = new AppModel(testServices(server))
    const view = mountScreen(
      app,
      <MacApp window={window}>
        <Shell />
      </MacApp>,
      { href: routes.org('acme') },
    )
    await settle()
    const link = railOperator(view)
    if (!link) throw new Error('The rail has no Operator link.')
    click(link)
    await settle()
    expect({
      title: view.querySelector('main h1')?.textContent,
      sidebars: view.querySelectorAll('aside[aria-label="Workspaces"]').length,
      toggleOff:
        view
          .querySelector('[aria-label="Hide the sidebar"]')
          ?.hasAttribute('disabled') ?? null,
    }).toEqual({ title: 'Operator', sidebars: 0, toggleOff: true })
  })
})
