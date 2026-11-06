// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { deleteOrgPath, type OrgSummary } from '../shared/orgs'
import { byRole, queryByRole } from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import {
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../test-support/mount'
import { createMembersApi } from './api/client'
import { DeleteOrgSection } from './DeleteOrgSection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org

it('deletes_the_org_with_the_typed_name_and_reports_the_deletion', async () => {
  const server = new FakeApiServer()
  const deleted: OrgSummary[] = []
  await mount(
    <DeleteOrgSection
      api={createMembersApi(server.fetch)}
      now={FAKE_TIME}
      onDeleted={(next) => deleted.push(next)}
      org={{ id: org, name: 'Acme', role: 'admin' }}
      timeZone="UTC"
      viewport="desktop"
    />,
  )
  await press(byRole('button', 'Delete org'))
  const dialog = byRole('dialog', 'Delete Acme?')
  const confirm = byRole('button', 'Delete org', dialog)
  expect(confirm.hasAttribute('disabled')).toBe(true)
  await typeText(byRole('textbox', 'Type Acme to confirm', dialog), 'Acme')
  expect(confirm.hasAttribute('disabled')).toBe(false)
  await press(confirm)
  const request = server.requests.at(-1)
  expect({
    method: request?.method,
    path: request && new URL(request.url).pathname,
    body: await request?.text(),
  }).toEqual({
    method: 'POST',
    path: deleteOrgPath(org),
    body: '{"name":"Acme"}',
  })
  await waitFor(() => deleted.length > 0, 'the report of the deletion')
  expect(deleted.map((item) => [item.id, item.deletion?.deletesAt])).toEqual([
    [org, 1_800_604_800_000],
  ])
  expect(queryByRole('dialog', 'Delete Acme?')).toBeNull()
})
