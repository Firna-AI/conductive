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

/** The words of the platform for a UTC day, as the chart writes a date. */
function utcDay(month: number, day: number, year: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(Date.UTC(year, month - 1, day))
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
        'Users 1,284 +46 in 7 days Orgs 312 +9 in 7 days Workspaces 2,481 +188 in 7 days Running now 39',
      states: 'Running 37 1% Stopped 1,604 65% Failed 12 0.5% Archived 828 33%',
      lines,
      opened: 'Kestrel Labs',
    })
    expect(await operatorRequests(server)).toEqual([
      `GET ${overviewPath}`,
      'GET /api/operator/orgs/org_k3str3l',
    ])
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

  test.each(['Pacific/Pago_Pago', 'Pacific/Noumea'])(
    'places each day of a chart at noon UTC, so in %s its first and last points name their UTC days',
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
      const points = queryAllByRole(
        'button',
        `${utcDay(12, 17, 2026)}. New workspaces: 9`,
      )
      const last = queryAllByRole(
        'button',
        `${utcDay(1, 15, 2027)}. New workspaces: 16`,
      )
      expect([points.length, last.length]).toEqual([1, 1])
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
        'AC Acme FX Futex FI Firna Operator C Operator Overview Orgs Users Workspaces New workspaces New users Largest orgs Org Members Workspaces Running',
      failed:
        'AC Acme FX Futex FI Firna Operator C Operator Overview Orgs Users The numbers could not load Try again',
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
