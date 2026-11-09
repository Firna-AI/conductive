// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { ManualDelay } from '../../app/test-kit'
import {
  operatorOrgsPath,
  type OperatorOrgsResponse,
  type OperatorOrgSummary,
} from '../../shared/operator'
import { byRole, byText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { orgRow } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle, typeText } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** A page of the Orgs tab. */
function page(
  orgs: readonly OperatorOrgSummary[],
  total = orgs.length,
  nextCursor: string | null = null,
): OperatorOrgsResponse {
  return { orgs, total, nextCursor }
}

/** The text of the box of the rows: its line, its rows, and Show more. */
function orgsBox(view: HTMLElement): string {
  return textOf(view.querySelector('main section')?.innerHTML ?? '')
}

/** The header of the table, and the rows of the samples, newest first. */
const header = 'Org Created Members Workspaces Running'
const sampleRows = [
  'RD Rhino Data 15 Jan 1 2 1',
  'TP Tidepool 14 Jan 2 3 0',
  'PC Pinecrest Deleted 10 Jan 2 4 0',
  'NL Northstar Labs 9 Jan 2 5 0',
  'HW Hexwave Suspended 4 Jan 3 10 2',
  'LW Lumen Works 1 Jan 2 18 1',
  'DL Dana’s Lab 28 Dec 2026 1 5 0',
  'BH Blue Harbor 16 Dec 2026 2 97 2',
  'NW Northwind 30 Sept 2026 2 164 4',
  'KL Kestrel Labs 14 Sept 2026 2 212 6',
  'OS Orbit Studio 9 Sept 2026 1 85 5',
  'AC Acme 2 Sept 2026 3 131 3',
  'FI Firna 1 Sept 2026 1 8 0',
  'FX Futex 31 Aug 2026 1 4 0',
]

describe('the Orgs tab of the operator section', () => {
  test('lists the newest orgs with their count, the state under a suspended or deleted name, and links to their pages', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.operatorOrgs())
    const box = orgsBox(view)
    click(byText('Hexwave'))
    await settle()
    expect({
      box,
      opened: view.querySelector('main h1')?.textContent,
    }).toEqual({
      box: ['Orgs 14 orgs, newest first.', header, ...sampleRows].join(' '),
      opened: 'Hexwave',
    })
  })

  test('takes the search from the address, and puts a new search there after a pause in the typing', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const north = fixtures.orgs.filter((org) => org.name.includes('North'))
    server.json(
      'GET',
      operatorOrgsPath({ q: 'north' }),
      page(north.map((org) => orgRow(org))),
    )
    const hexwave = fixtures.orgs.filter((org) => org.name === 'Hexwave')
    server.json(
      'GET',
      operatorOrgsPath({ q: 'hex' }),
      page(hexwave.map((org) => orgRow(org))),
    )
    const delay = new ManualDelay()
    const { view } = await mountShell(server, routes.operatorOrgs('north'), {
      services: { delay: delay.delay },
    })
    const field = byRole('textbox', 'Search orgs')
    if (!(field instanceof HTMLInputElement)) throw new Error('No field.')
    const searched = { field: field.value, line: orgsBox(view).slice(0, 34) }
    typeText(field, ' hex ')
    await settle()
    const typing = await operatorRequests(server)
    await act(() => delay.runAll())
    await settle()
    expect({
      searched,
      typing,
      after: await operatorRequests(server),
      line: orgsBox(view).slice(0, 32),
    }).toEqual({
      searched: { field: 'north', line: 'Orgs 2 orgs match “north”. Org Cre' },
      typing: ['GET /api/operator/orgs?q=north'],
      after: ['GET /api/operator/orgs?q=north', 'GET /api/operator/orgs?q=hex'],
      line: 'Orgs 1 org matches “hex”. Org Cr',
    })
  })

  test('a search by a preview address says what matched, with the state of the org, and a search with no match says so', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const hexwave = fixtures.orgs.find(
      (org) => org.id === SAMPLE_IDS.suspendedOrg,
    )
    if (!hexwave) throw new Error('The samples have no Hexwave.')
    const address = 'https://k7q2m9fz.conductive.page'
    server.json(
      'GET',
      operatorOrgsPath({ q: address }),
      page([orgRow(hexwave, 'preview-address')]),
    )
    server.json('GET', operatorOrgsPath({ q: 'acme-old' }), page([]))
    const lookup = await mountShell(server, routes.operatorOrgs(address))
    const none = await mountShell(server, routes.operatorOrgs('acme-old'))
    expect({
      lookup: orgsBox(lookup.view),
      none: textOf(none.view.querySelector('main section')?.innerHTML ?? ''),
    }).toEqual({
      lookup:
        'Orgs 1 org matches this preview address. Org Created Members Workspaces Running HW Hexwave Preview address · Suspended 4 Jan 3 10 2',
      none: 'Orgs Search by name, org ID, cloud computer ID, or preview address. No org matches “acme-old”.',
    })
  })

  test('Show more reads the next page with the cursor, and a failed read keeps the rows with Try again', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const rows = fixtures.orgs.map((org) => orgRow(org))
    server.json('GET', operatorOrgsPath(), page(rows.slice(0, 12), 14, 'next'))
    const failure = {
      error: { code: 'internal_error', message: 'The request failed.' },
    }
    server.json('GET', operatorOrgsPath({ cursor: 'next' }), failure, 500)
    const { view } = await mountShell(server, routes.operatorOrgs())
    click(byRole('button', 'Show more'))
    await settle()
    const failed = orgsBox(view)
    server.json(
      'GET',
      operatorOrgsPath({ cursor: 'next' }),
      page(rows.slice(12), 14),
    )
    click(byRole('button', 'Try again'))
    await settle()
    const line = 'Orgs 14 orgs, newest first.'
    expect({
      failed,
      after: orgsBox(view),
      requests: await operatorRequests(server),
    }).toEqual({
      failed: [
        line,
        header,
        ...sampleRows.slice(0, 12),
        'More orgs could not load The request failed. Try again',
      ].join(' '),
      after: [line, header, ...sampleRows].join(' '),
      requests: [
        'GET /api/operator/orgs',
        'GET /api/operator/orgs?cursor=next',
        'GET /api/operator/orgs?cursor=next',
      ],
    })
  })
})
