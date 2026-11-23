// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { formatRunLength } from '../../ui/components/operator/longRunsCopy'
import { routes } from '../../app/router'
import {
  operatorOrgPath,
  operatorOverviewPath,
  operatorUserPath,
} from '../../shared/operator'
import { operatorProvidersPath } from '../../shared/operator-providers'
import {
  accessibleName,
  byRole,
  shownToasts,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import {
  boxOf,
  boxText,
  mountShell,
  operatorRequests,
} from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const title = 'Long runs'

/** The box of the long runs. */
function runsBox(view: HTMLElement): HTMLElement {
  const box = boxOf(view, title)
  if (!box) throw new Error('The Overview has no box of the long runs.')
  return box
}

/**
 * The rows of the samples on desktop, the longest run first. The run of
 * Blue Harbor has no saved last activity in the first test.
 */
const desktopRows = [
  'Rhino Data @rho-9 W-1 sbx_org_rh1n0d4t 1 minute ago 10h 0m Ready',
  'Pinecrest Deleted @ana-p W-2 sbx_org_p1n3cr7t 2 minutes ago 9h 0m Ready',
  'Hexwave Suspended @dana-k Suspended W-3 sbx_7f3k9q2m 3 minutes ago 8h 0m Ready',
  'Lumen Works @li-wei W-4 sbx_org_lum3nw0rk 4 minutes ago 7h 0m Ready',
  'Blue Harbor @mira-s W-5 sbx_org_blu3h4rb Unknown 6h 0m Ready',
  'Northwind @li-wei W-6 sbx_org_n0rthw1nd 6 minutes ago 5h 0m Ready',
  'Kestrel Labs @tomas-r W-7 sbx_org_k3str3l 7 minutes ago 4h 0m Ready',
  'Orbit Studio @danny-b W-8 sbx_org_0rb1tstd 8 minutes ago 3h 0m Ready',
  'Acme @calummoore W-9 — No cloud computer ID yet Just now 41s Starting',
]

describe('the Long runs of the operator Overview', () => {
  test('lists each run with its org and mark, its owner with the mark and the workspace number, the cloud computer ID with Copy or a dash, the last activity or Unknown, and the run length with the state, and a deleted org opens its page', async () => {
    const server = new FakeApiServer()
    const { overview } = serveOperator(server)
    server.json('GET', operatorOverviewPath(), {
      ...overview,
      longRuns: overview.longRuns.map((run) =>
        run.orgName === 'Blue Harbor' ? { ...run, lastActivityAt: null } : run,
      ),
    })
    const { view } = await mountShell(server, routes.operator())
    const box = runsBox(view)
    const shown = {
      text: boxText(view, title),
      copies: Array.from(box.querySelectorAll('button'), accessibleName),
      owner: byRole('link', '@dana-k', box).getAttribute('href'),
    }
    click(byRole('link', 'Pinecrest', box))
    await settle()
    expect({
      ...shown,
      opened: view.querySelector('main h1')?.textContent,
    }).toEqual({
      text: [
        'Long runs Org Owner Cloud computer Last activity Running for',
        ...desktopRows,
      ].join(' '),
      copies: [
        'Copy the cloud computer ID sbx_org_rh1n0d4t',
        'Copy the cloud computer ID sbx_org_p1n3cr7t',
        'Copy the cloud computer ID sbx_7f3k9q2m',
        'Copy the cloud computer ID sbx_org_lum3nw0rk',
        'Copy the cloud computer ID sbx_org_blu3h4rb',
        'Copy the cloud computer ID sbx_org_n0rthw1nd',
        'Copy the cloud computer ID sbx_org_k3str3l',
        'Copy the cloud computer ID sbx_org_0rb1tstd',
      ],
      owner: routes.operatorUser(SAMPLE_IDS.suspendedUser),
      opened: 'Pinecrest',
    })
    expect(await operatorRequests(server)).toEqual([
      `GET ${operatorOverviewPath()}`,
      `GET ${operatorOrgPath(SAMPLE_IDS.deletedOrg)}`,
      `GET ${operatorProvidersPath()}`,
    ])
  })

  test('Copy puts the cloud computer ID on the clipboard and says so, and a copy that fails says that the ID did not copy', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const copied: string[] = []
    const copy = async (text: string | Promise<string>) => {
      const value = await text
      if (value === 'sbx_org_rh1n0d4t') {
        throw new Error('The clipboard refused the text.')
      }
      copied.push(value)
    }
    const { view } = await mountShell(server, routes.operator(), {
      services: { copy },
    })
    const box = runsBox(view)
    click(byRole('button', 'Copy the cloud computer ID sbx_7f3k9q2m', box))
    await settle()
    click(byRole('button', 'Copy the cloud computer ID sbx_org_rh1n0d4t', box))
    await settle()
    expect({
      copied,
      toasts: shownToasts().map((toast) => textOf(toast.innerHTML)),
    }).toEqual({
      copied: ['sbx_7f3k9q2m'],
      toasts: [
        'Copied sbx_7f3k9q2m',
        "sbx_org_rh1n0d4t didn't copy Something went wrong. Try again.",
      ],
    })
  })

  test('with no run, the box says which workspaces show in it', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    server.json('GET', operatorOverviewPath(), {
      ...fixtures.overview,
      longRuns: [],
    })
    const { view } = await mountShell(server, routes.operator())
    expect(boxText(view, title)).toBe(
      'Long runs The workspaces with the longest runs show here.',
    )
  })

  test('on a phone, a row keeps the org and the run length with the state, and a suspended owner adds the login, which opens their page, and the mark under the org', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.operator(), {
      viewport: 'phone',
    })
    const text = boxText(view, title)
    click(byRole('link', '@dana-k', runsBox(view)))
    await settle()
    expect({
      text,
      opened: view.querySelector('main h1')?.textContent,
    }).toEqual({
      text: [
        'Long runs Org Running for',
        'Rhino Data 10h 0m Ready',
        'Pinecrest Deleted 9h 0m Ready',
        'Hexwave Suspended @dana-k · Suspended 8h 0m Ready',
        'Lumen Works 7h 0m Ready',
        'Blue Harbor 6h 0m Ready',
        'Northwind 5h 0m Ready',
        'Kestrel Labs 4h 0m Ready',
        'Orbit Studio 3h 0m Ready',
        'Acme 41s Starting',
      ].join(' '),
      opened: '@dana-k',
    })
    expect(await operatorRequests(server)).toEqual([
      `GET ${operatorOverviewPath()}`,
      `GET ${operatorUserPath(SAMPLE_IDS.suspendedUser)}`,
    ])
  })
})

describe('the run length of a long run', () => {
  test('gives the seconds under a minute, the minutes under an hour, and the two largest units from an hour', () => {
    const second = 1_000
    const minute = 60 * second
    const hour = 60 * minute
    const day = 24 * hour
    const lengths = [
      41 * second,
      59 * second,
      minute,
      48 * minute,
      hour,
      5 * hour + 12 * minute,
      23 * hour + 59 * minute,
      day,
      3 * day + 4 * hour,
    ]
    expect(lengths.map(formatRunLength)).toEqual([
      '41s',
      '59s',
      '1m',
      '48m',
      '1h 0m',
      '5h 12m',
      '23h 59m',
      '1d 0h',
      '3d 4h',
    ])
  })
})
