// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../app/test-kit'
import { API_PATHS } from '../../shared/api'
import { restoreOrgPath, type OrgSummary } from '../../shared/orgs'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import {
  orgSuspendedBody,
  serveSuspendedAcme,
} from '../../test-support/suspended-org'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { HomeList } from './HomeList'
import { DeletedOrg } from './OrgHome'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const orgNotice =
  'Acme is suspendedIts workspaces and settings are read-only. For questions, write to abuse@conductive.build.'
const deletionDay =
  "Acme is deleted on 22 JanuaryIts cloud computers are stopped, and its members can't open it."

describe('the list of a suspended org', () => {
  test('shows its notice and no New workspace or section menu, and opens a collapsed section with no write', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const app = await startedApp(server)
    const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
    if (!org) throw new Error('The fake org is missing.')
    const view = mountScreen(app, <HomeList org={org} user={fakeUser} />, {
      viewport: 'phone',
    })
    await settle()
    const infra = view.querySelector<HTMLButtonElement>(
      'section[aria-label="Infra"] button[aria-expanded]',
    )
    if (!infra) throw new Error('The Infra section is missing.')
    const collapsed = infra.getAttribute('aria-expanded')
    click(infra)
    await settle()
    const text = view.textContent ?? ''
    expect({
      notice: text.includes(orgNotice),
      newWorkspace: queryByRole('link', 'New workspace', view) !== null,
      menus: view.querySelectorAll('[aria-label^="More for"]').length,
      collapsed,
      expanded: infra.getAttribute('aria-expanded'),
      row: text.includes('Upgrade to Next.js 16'),
      writes: requestLines(server).filter((line) => !line.startsWith('GET ')),
    }).toEqual({
      notice: true,
      newWorkspace: false,
      menus: 0,
      collapsed: 'false',
      expanded: 'true',
      row: true,
      writes: [],
    })
  })

  test('a deleted org that is also suspended shows the notice of the org above the day of the delete and offers no Restore, and a deleted org in use keeps Restore until the API refuses it', async () => {
    const server = new FakeApiServer()
    const deleted: OrgSummary = {
      id: FAKE_IDS.org,
      name: 'Acme',
      role: 'admin',
      deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 7 * 86_400_000 },
    }
    // The org list is old: it shows no suspension, and the API refuses a Restore.
    server.json('GET', API_PATHS.orgs, { orgs: [deleted] })
    server.json('POST', restoreOrgPath(FAKE_IDS.org), orgSuspendedBody, 403)
    const app = await startedApp(server)
    const page = async (org: OrgSummary) => {
      const view = mountScreen(app, <DeletedOrg org={org} />)
      await settle()
      return view
    }
    const suspendedView = await page({
      ...deleted,
      suspension: { suspendedAt: FAKE_TIME },
    })
    const suspended = suspendedView.textContent ?? ''
    const inUseView = await page(deleted)
    const inUse = inUseView.textContent ?? ''
    click(byRole('button', 'Restore Acme', inUseView))
    await settle()
    const refused = inUseView.textContent ?? ''
    expect({
      suspended: {
        notice: suspended.includes(orgNotice),
        above:
          suspended.indexOf('Acme is suspended') <
          suspended.indexOf('Acme is deleted on'),
        day: suspended.includes(deletionDay),
        restore: suspended.includes('Restore'),
      },
      inUse: {
        notice: inUse.includes('Acme is suspended'),
        restore: inUse.includes('Restore Acme'),
      },
      refused: {
        notice: refused.includes(orgNotice),
        above:
          refused.indexOf('Acme is suspended') <
          refused.indexOf('Acme is deleted on'),
        day: refused.includes(deletionDay),
        restore: queryByRole('button', 'Restore Acme', inUseView) !== null,
        writes: requestLines(server).filter((line) => !line.startsWith('GET ')),
        orgs: app.orgs.get(),
      },
    }).toEqual({
      suspended: { notice: true, above: true, day: true, restore: false },
      inUse: { notice: false, restore: true },
      refused: {
        notice: true,
        above: true,
        day: true,
        restore: false,
        writes: [`POST ${restoreOrgPath(FAKE_IDS.org)}`],
        orgs: [deleted],
      },
    })
  })
})
