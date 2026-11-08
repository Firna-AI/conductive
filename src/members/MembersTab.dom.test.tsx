// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type { Org } from '../shared/api'
import {
  invitesPath,
  memberPath,
  type InviteMemberResponse,
  type OrgMember,
} from '../shared/members'
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
  pressKey,
  typeText,
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

/** The email field of the invite, as a person finds it. */
function emailField(): HTMLInputElement {
  const field = byRole('textbox', 'Email')
  if (!(field instanceof HTMLInputElement)) {
    throw new Error('The email field is not an input')
  }
  return field
}

/** The answer of the API to a new invite. */
function inviteReply(email: string): InviteMemberResponse {
  return { invite: { id: `invite-${email}`, email, createdAt: FAKE_TIME } }
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

  it('sends_one_invite_at_a_time_and_clears_the_field_only_when_its_email_went_out', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const reply = deferred()
    const sent: unknown[] = []
    const held: FetchLike = async (input, init) => {
      if (init?.method === 'POST' && typeof init.body === 'string') {
        sent.push(JSON.parse(init.body))
        await reply.promise
      }
      return server.fetch(input, init)
    }
    await mount(tab(held, []))
    const list = await waitFor(
      () => queryByRole('list', 'Members'),
      'the list of members',
    )
    const field = emailField()
    expect(field.type).toBe('email')
    await typeText(field, 'ana@example.com')
    await press(byRole('button', 'Invite'))
    expect(byRole('button', 'Invite').getAttribute('aria-busy')).toBe('true')
    // The field stays open for the next email, which waits for the first.
    await typeText(field, 'ben@example.com')
    await pressKey('Enter')
    await press(byRole('button', 'Invite'))
    expect(sent).toEqual([{ email: 'ana@example.com' }])
    const path = invitesPath(org.id)
    server.json('POST', path, inviteReply('ana@example.com'), 201)
    reply.resolve()
    await waitFor(
      () => queryByText('ana@example.com', list),
      'the invite to ana@example.com in the list',
    )
    expect(field.value).toBe('ben@example.com')
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('POST', path, { error: failure }, 500)
    await press(byRole('button', 'Invite'))
    await waitFor(
      () => queryByText('The invite to ben@example.com failed'),
      'the failure of the invite to ben@example.com',
    )
    expect(field.value).toBe('ben@example.com')
    server.json('POST', path, inviteReply('ben@example.com'), 201)
    await press(byRole('button', 'Invite'))
    await waitFor(
      () => queryByText('ben@example.com', list),
      'the invite to ben@example.com in the list',
    )
    expect({
      field: field.value,
      failure: queryByText('The invite to ben@example.com failed'),
      sent,
    }).toEqual({
      field: '',
      failure: null,
      sent: [
        { email: 'ana@example.com' },
        { email: 'ben@example.com' },
        { email: 'ben@example.com' },
      ],
    })
  })

  it('shows_only_the_failure_of_the_last_invite_that_the_admin_sent', async () => {
    const server = new FakeApiServer()
    await mount(tab(server.fetch, []))
    const list = await waitFor(
      () => queryByRole('list', 'Members'),
      'the list of members',
    )
    const path = invitesPath(org.id)
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('POST', path, { error: failure }, 500)
    await typeText(emailField(), 'ana@example.com')
    await press(byRole('button', 'Invite'))
    await waitFor(
      () => queryByText('The invite to ana@example.com failed'),
      'the failure of the invite to ana@example.com',
    )
    server.json('POST', path, inviteReply('ben@example.com'), 201)
    await typeText(emailField(), 'ben@example.com')
    await press(byRole('button', 'Invite'))
    await waitFor(
      () => queryByText('ben@example.com', list),
      'the invite to ben@example.com in the list',
    )
    expect(queryByText('The invite to ana@example.com failed')).toBeNull()
  })
})
