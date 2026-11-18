// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { restoreOrgPath, type OrgSummary } from '../../shared/orgs'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { DeletedOrgsSection } from './DeletedOrgsSection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

const deletion = { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 604_800_000 }

/** Changes Acme in the org list of the app. */
function changeAcme(app: AppModel, change: Partial<OrgSummary>) {
  const acme = app.orgs.get().find((item) => item.id === org)
  if (!acme) throw new Error('The app has no Acme.')
  app.putOrg({ ...acme, ...change })
}

/** The rows of the section, as text, or null without the section. */
function rows(view: HTMLElement): string[] | null {
  const list = view.querySelector('ul[aria-label="Deleted orgs"]')
  if (!list) return null
  return Array.from(list.children, (row) => String(row.textContent))
}

describe('the Deleted orgs section of the account', () => {
  test('shows nothing while the user has no deleted org', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    const view = mountScreen(app, <DeletedOrgsSection />)
    expect({ rows: rows(view), title: view.querySelector('h2') }).toEqual({
      rows: null,
      title: null,
    })
  })

  test('keeps the org and shows the error of a failed Restore, and a second Restore brings the org back', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server)
    changeAcme(app, { deletion })
    const view = mountScreen(app, <DeletedOrgsSection />)
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('POST', restoreOrgPath(org), { error: failure }, 500)
    await press(byRole('button', 'Restore Acme', view))
    await waitFor(
      () => view.querySelector('[role="alert"]'),
      'the failure under the row',
    )
    const failed = rows(view)
    const acme = app.orgs.get().find((item) => item.id === org)
    server.json('POST', restoreOrgPath(org), {
      org: { ...acme, deletion: undefined },
    })
    await press(byRole('button', 'Restore Acme', view))
    await waitFor(() => rows(view) === null, 'Acme as an active org')
    expect({
      failed,
      restored: app.orgs.get().find((item) => item.id === org)?.deletion,
    }).toEqual({
      failed: [
        'ACAcmeEverything is deleted on 22 JanuaryRestoreAcme was not restoredThe request failed. Try again.',
      ],
      restored: undefined,
    })
  })

  test('offers no Restore for a deleted org that the operator suspended', async () => {
    holdAnimationFrames()
    const app = await startedApp(new FakeApiServer())
    changeAcme(app, { deletion, suspension: { suspendedAt: FAKE_TIME } })
    const view = mountScreen(app, <DeletedOrgsSection />)
    expect({
      rows: rows(view),
      restore: queryByRole('button', 'Restore Acme', view),
    }).toEqual({
      rows: [
        "ACAcmeSuspended, so it can't be restored. Everything is deleted on 22 January",
      ],
      restore: null,
    })
  })
})
