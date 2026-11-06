// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { deleteOrgPath, type OrgSummary } from '../shared/orgs'
import {
  byDialog,
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import {
  deferred,
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../test-support/mount'
import { createMembersApi, type FetchLike } from './api/client'
import { closeRequests } from './closeRequests'
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

it('keeps_the_question_open_on_a_phone_while_the_deletion_runs', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer()
  const reply = deferred()
  const held: FetchLike = async (input, init) => {
    if (init?.method === 'POST') await reply.promise
    return server.fetch(input, init)
  }
  const deleted: OrgSummary[] = []
  await mount(
    <DeleteOrgSection
      api={createMembersApi(held)}
      now={FAKE_TIME}
      onDeleted={(next) => deleted.push(next)}
      org={{ id: org, name: 'Acme', role: 'admin' }}
      timeZone="UTC"
      viewport="mobile"
    />,
  )
  await press(byRole('button', 'Delete org'))
  const sheet = byDialog('Delete Acme?')
  await typeText(byRole('textbox', 'Type Acme to confirm', sheet), 'Acme')
  await press(byRole('button', 'Delete org', sheet))
  expect(byRole('button', 'Delete org', sheet).getAttribute('aria-busy')).toBe(
    'true',
  )
  for (const request of closeRequests(sheet, { cancelButton: true })) {
    await request.send()
    expect({ how: request.how, open: sheet.open }).toEqual({
      how: request.how,
      open: true,
    })
  }
  const failure = {
    code: 'internal_error',
    message: 'The request failed. Try again.',
  }
  server.json('POST', deleteOrgPath(org), { error: failure }, 500)
  reply.resolve()
  await waitFor(
    () => queryByText('Acme was not deleted', sheet),
    'the failure in the open question',
  )
  byText('The request failed. Try again.', sheet)
  expect({ open: sheet.open, deleted }).toEqual({ open: true, deleted: [] })
  await press(byRole('button', 'Cancel', sheet))
  expect(sheet.open).toBe(false)
})
