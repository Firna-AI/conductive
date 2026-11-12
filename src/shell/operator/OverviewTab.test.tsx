// @vitest-environment happy-dom

import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import { operatorOverviewPath } from '../../shared/operator'
import {
  byLabel,
  byRole,
  byText,
  queryAllByRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const overviewPath = operatorOverviewPath()

/** The labels of the axis of a chart that name a day, such as "17 Dec". */
function axisDays(chart: HTMLElement): string[] {
  return Array.from(chart.querySelectorAll('*'), (element) =>
    element.children.length === 0 ? (element.textContent ?? '') : '',
  ).filter((text) => /^\d{1,2} [A-Z][a-z]+$/.test(text))
}

describe('the Overview of the operator section', () => {
  test('shows the totals with their 7 days, the workspaces by state with the running builds, the 30-day totals, and the largest orgs, which open their pages', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, '/operator')
    const lines = [
      'Running now also counts 2 cloud computer builds.',
      '623 in the last 30 days, by UTC day.',
      '154 in the last 30 days, by UTC day.',
    ]
    const shown = {
      header: textOf(view.querySelector('main header')?.innerHTML ?? ''),
      totals: textOf(byRole('region', 'Totals').innerHTML),
      states: textOf(byRole('list', 'Workspaces by state').innerHTML),
      lines: lines.filter((line) => queryByText(line) !== null),
    }
    click(byText('Kestrel Labs'))
    await settle()
    expect({
      ...shown,
      opened: view.querySelector('main h1')?.textContent,
    }).toEqual({
      header: 'Operator Updated at 08:00 Refresh',
      totals:
        'Users 1,284 +46 in 7 days 10 on the waitlist Orgs 312 +9 in 7 days Workspaces 2,481 +188 in 7 days Running now 39',
      states: 'Running 37 1% Stopped 1,604 65% Failed 12 0.5% Archived 828 33%',
      lines,
      opened: 'Kestrel Labs',
    })
    expect(await operatorRequests(server)).toEqual([
      `GET ${overviewPath}`,
      'GET /api/operator/orgs/org_k3str3l',
    ])
  })

  test('the line under the users counts the people who wait, and opens the Waitlist tab', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    server.json('GET', overviewPath, { ...fixtures.overview, waiting: 1284 })
    const { view } = await mountShell(server, '/operator')
    click(byText('1,284 on the waitlist'))
    await settle()
    expect({
      tab: view.querySelector(
        'nav[aria-label="Operator"] [aria-current="page"]',
      )?.textContent,
      requests: await operatorRequests(server),
    }).toEqual({
      tab: 'Waitlist',
      requests: [`GET ${overviewPath}`, 'GET /api/operator/waitlist'],
    })
  })

  test('lists the largest orgs with their counts, and their table of days names each UTC day', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    await mountShell(server, '/operator')
    const largest = textOf(byLabel('Largest orgs').innerHTML)
    const [toggle] = queryAllByRole('button', 'Show data table')
    click(toggle)
    await settle()
    const days = byLabel('New workspaces each day, as a table')
    expect({
      largest,
      days: textOf(days.innerHTML).slice(0, 52),
    }).toEqual({
      largest:
        'Org Members Workspaces Running Kestrel Labs 2 212 6 Northwind 2 164 4 Acme 3 131 3 Blue Harbor 2 97 2 Orbit Studio 1 85 5',
      days: 'UTC day New workspaces 17 Dec 2026 9 18 Dec 2026 8 1',
    })
  })

  test.each(['America/Los_Angeles', 'Pacific/Tongatapu'])(
    'names each day of a chart by its UTC day in %s, on the axis and on its points',
    async (zone) => {
      const before = process.env.TZ
      process.env.TZ = zone
      onTestFinished(() => {
        if (before === undefined) delete process.env.TZ
        else process.env.TZ = before
      })
      const server = new FakeApiServer()
      serveOperator(server)
      await mountShell(server, '/operator')
      const chart = byText('New workspaces').closest('section')
      if (!chart) throw new Error('The page has no chart of new workspaces.')
      const point = (label: string) =>
        queryAllByRole('button', label, chart).length
      expect({
        axis: axisDays(chart),
        first: point('17 Dec. New workspaces: 9'),
        last: point('15 Jan. New workspaces: 16'),
      }).toEqual({
        axis: [
          '17 Dec',
          '20 Dec',
          '23 Dec',
          '26 Dec',
          '29 Dec',
          '1 Jan',
          '4 Jan',
          '7 Jan',
          '10 Jan',
          '13 Jan',
        ],
        first: 1,
        last: 1,
      })
    },
  )

  test('keeps the boxes in place while the numbers load, shows only a notice when they fail, and Try again reads them again', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const held = new HeldRequests(server)
    held.hold('GET', overviewPath)
    const { text } = await mountShell(server, '/operator', {
      services: { fetch: held.fetch },
    })
    const loading = text()
    server.json(
      'GET',
      overviewPath,
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    held.release('GET', overviewPath)
    await settle()
    const failed = text()
    serveOperator(server)
    click(byRole('button', 'Try again'))
    await settle()
    expect({
      loading,
      failed,
      retried: queryByRole('region', 'Totals') !== null,
    }).toEqual({
      loading:
        'AC Acme Alt 1 Alt 1 FX Futex Alt 2 Alt 2 FI Firna Alt 3 Alt 3 Operator C Operator Overview Orgs Users Waitlist Invite codes Providers Workspaces New workspaces New users Largest orgs Org Members Workspaces Running',
      failed:
        'AC Acme Alt 1 Alt 1 FX Futex Alt 2 Alt 2 FI Firna Alt 3 Alt 3 Operator C Operator Overview Orgs Users Waitlist Invite codes Providers The numbers could not load Try again',
      retried: true,
    })
    expect(await operatorRequests(server)).toEqual([
      `GET ${overviewPath}`,
      `GET ${overviewPath}`,
    ])
  })

  test('Refresh reads the numbers again and keeps them until the answer, and a phone has no Refresh', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const held = new HeldRequests(server)
    const { text } = await mountShell(server, '/operator', {
      services: { fetch: held.fetch },
    })
    serveOperator(server, FAKE_TIME + 5 * 60_000)
    held.holdAnswer('GET', overviewPath)
    click(byRole('button', 'Refresh'))
    await settle()
    const reading = text().includes('Users 1,284 +46 in 7 days')
    held.release('GET', overviewPath)
    await settle()
    const updated = queryByText('Updated at 08:05') !== null
    const phone = await mountShell(server, '/operator', { viewport: 'phone' })
    expect({
      reading,
      updated,
      phone: phone.text().includes('Refresh'),
    }).toEqual({ reading: true, updated: true, phone: false })
  })
})
