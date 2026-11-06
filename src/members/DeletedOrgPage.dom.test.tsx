// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { restoreOrgPath, type OrgSummary } from '../shared/orgs'
import {
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import {
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../test-support/mount'
import { createMembersApi } from './api/client'
import { DeletedOrgPage } from './DeletedOrgPage'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const deletedAcme: OrgSummary = {
  id: 'acme',
  name: 'Acme',
  role: 'admin',
  deletion: {
    deletedAt: Date.UTC(2026, 10, 5, 12),
    deletesAt: Date.UTC(2026, 10, 12, 12),
  },
}
/** The org of the API's answer: active again, with its initials. */
const restoredAcme: OrgSummary = {
  id: 'acme',
  name: 'Acme',
  role: 'admin',
  initials: 'AC',
}

function page(server: FakeApiServer, restored: OrgSummary[]) {
  return (
    <DeletedOrgPage
      api={createMembersApi(server.fetch)}
      onRestored={(org) => restored.push(org)}
      org={deletedAcme}
      timeZone="UTC"
      viewport="desktop"
    />
  )
}

describe('the deleted org page of an admin', () => {
  // Moved from roleViews.test.tsx with its checks of the day and of Restore.
  it('name_the_day_of_the_deletion_from_deletesAt_and_restore_the_org', async () => {
    const server = new FakeApiServer()
    server.json('POST', restoreOrgPath('acme'), { org: restoredAcme })
    const restored: OrgSummary[] = []
    await mount(page(server, restored))
    expect({
      day: queryByText('Acme is deleted on 12 November') !== null,
      restore: queryByRole('button', 'Restore Acme') !== null,
    }).toEqual({ day: true, restore: true })
    await press(byRole('button', 'Restore Acme'))
    const request = server.requests.at(-1)
    expect({
      method: request?.method,
      path: request && new URL(request.url).pathname,
    }).toEqual({ method: 'POST', path: restoreOrgPath('acme') })
    await waitFor(() => restored.length > 0, 'the report of the restore')
    expect(restored).toEqual([restoredAcme])
  })

  it('shows_a_failed_restore_and_restores_the_org_on_a_retry', async () => {
    const server = new FakeApiServer()
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('POST', restoreOrgPath('acme'), { error: failure }, 500)
    const restored: OrgSummary[] = []
    await mount(page(server, restored))
    await press(byRole('button', 'Restore Acme'))
    const title = await waitFor(
      () => queryByText('Acme was not restored'),
      'the failed restore',
    )
    const notice = title.closest('[role="alert"]')
    expect(notice?.contains(byText('The request failed. Try again.'))).toBe(
      true,
    )
    expect(restored).toEqual([])
    server.json('POST', restoreOrgPath('acme'), { org: restoredAcme })
    await press(byRole('button', 'Restore Acme'))
    await waitFor(() => restored.length > 0, 'the report of the restore')
    expect(restored).toEqual([restoredAcme])
    expect(queryByText('Acme was not restored')).toBeNull()
  })
})
