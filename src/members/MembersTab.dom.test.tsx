// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type { Org } from '../shared/api'
import { memberPath, type OrgMember } from '../shared/members'
import {
  byDialog,
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import {
  deferred,
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../test-support/mount'
import { createMembersApi, type FetchLike } from './api/client'
import { closeRequests } from './closeRequests'
import { MembersTab } from './MembersTab'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org: Org = { id: FAKE_IDS.org, name: 'Acme', role: 'admin' }
const question = 'Remove Priya Raman from Acme?'

function tab(fetch: FetchLike, removed: OrgMember[]) {
  return (
    <MembersTab
      api={createMembersApi(fetch)}
      now={FAKE_TIME}
      onMemberRemoved={(member) => removed.push(member)}
      org={org}
      viewerId="cal"
      viewport="desktop"
    />
  )
}

/** Opens the question about Priya and presses Remove member. */
async function removePriya(): Promise<HTMLDialogElement> {
  await press(
    await waitFor(
      () => queryByRole('button', 'Remove Priya Raman'),
      'the Remove button of Priya Raman',
    ),
  )
  const dialog = byDialog(question)
  await press(byRole('button', 'Remove member', dialog))
  return dialog
}

describe('MembersTab of an admin', () => {
  it('removes_a_member_through_the_question_and_reports_the_member', async () => {
    const priya = coreFixtures().members.members.find(
      (member) => member.user.id === 'priya',
    )
    const removed: OrgMember[] = []
    await mount(tab(new FakeApiServer().fetch, removed))
    const before = await waitFor(
      () => queryByRole('list', 'Members'),
      'the list of members',
    )
    byText('Priya Raman', before)
    const dialog = await removePriya()
    await waitFor(() => removed.length > 0, 'the report of the removal')
    expect(removed).toEqual([priya])
    expect(dialog.open).toBe(false)
    expect(queryByRole('dialog', question)).toBeNull()
    const after = byRole('list', 'Members')
    expect({
      priya: queryByText('Priya Raman', after),
      jonas: queryByText('Jonas Weber', after)?.isConnected,
    }).toEqual({ priya: null, jonas: true })
  })

  it('keeps_the_question_open_while_the_removal_runs', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const reply = deferred()
    const held: FetchLike = async (input, init) => {
      if (init?.method === 'DELETE') await reply.promise
      return server.fetch(input, init)
    }
    const removed: OrgMember[] = []
    await mount(tab(held, removed))
    const dialog = await removePriya()
    const confirm = byRole('button', 'Remove member', dialog)
    expect(confirm.getAttribute('aria-busy')).toBe('true')
    for (const request of closeRequests(dialog, { cancelButton: true })) {
      await request.send()
      expect({ how: request.how, open: dialog.open }).toEqual({
        how: request.how,
        open: true,
      })
    }
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('DELETE', memberPath(org.id, 'priya'), { error: failure }, 500)
    reply.resolve()
    await waitFor(
      () => queryByText('Priya Raman is still a member', dialog),
      'the failure in the open question',
    )
    byText('The request failed. Try again.', dialog)
    expect({ open: dialog.open, removed }).toEqual({ open: true, removed: [] })
    await press(byRole('button', 'Cancel', dialog))
    expect(dialog.open).toBe(false)
  })
})
