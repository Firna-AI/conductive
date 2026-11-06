import { describe, expect, it } from 'vitest'
import { invitesPath, memberPath } from '../shared/members'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { createMembersApi } from './api/client'
import { createMembersStore, type MembersStore } from './membersStore'

const org = FAKE_IDS.org

/** The fake's org has Cal (admin), Priya, and Jonas, with 6, 2, and 1 workspaces. */
async function loadedStore(server = new FakeApiServer()) {
  const store = createMembersStore(createMembersApi(server.fetch), org, 'cal')
  await store.load()
  return { server, store }
}

function ready(store: MembersStore) {
  const state = store.getState()
  if (state.status !== 'ready') throw new Error(`The store is ${state.status}.`)
  return state
}

function roles(store: MembersStore) {
  return ready(store).data.members.map((member) => [
    member.user.id,
    member.role,
  ])
}

describe('createMembersStore', () => {
  it('loads_each_member_with_the_number_of_workspaces_they_own', async () => {
    const { store } = await loadedStore()
    expect(roles(store)).toEqual([
      ['cal', 'admin'],
      ['priya', 'member'],
      ['jonas', 'member'],
    ])
    expect(ready(store).data.owned).toEqual({ cal: 6, priya: 2, jonas: 1 })
  })

  it('moves_the_workspaces_of_a_removed_member_to_the_admin_who_removes_them', async () => {
    const { server, store } = await loadedStore()
    expect(await store.remove('priya')).toBe(true)
    const request = server.requests.at(-1)
    expect([request?.method, request && new URL(request.url).pathname]).toEqual(
      ['DELETE', memberPath(org, 'priya')],
    )
    expect(roles(store)).toEqual([
      ['cal', 'admin'],
      ['jonas', 'member'],
    ])
    expect(ready(store).data.owned).toEqual({ cal: 8, jonas: 1 })
  })

  it('keeps_the_member_and_gives_the_reason_when_a_removal_fails', async () => {
    const server = new FakeApiServer()
    const message = 'The request failed. Try again.'
    server.json(
      'DELETE',
      memberPath(org, 'priya'),
      { error: { code: 'internal_error', message } },
      500,
    )
    const { store } = await loadedStore(server)
    expect(await store.remove('priya')).toBe(false)
    expect(roles(store)).toEqual([
      ['cal', 'admin'],
      ['priya', 'member'],
      ['jonas', 'member'],
    ])
    expect(ready(store).data.owned).toEqual({ cal: 6, priya: 2, jonas: 1 })
    expect(ready(store).failure).toEqual({
      action: 'remove',
      target: 'priya',
      message,
    })
    expect(ready(store).pending).toEqual([])
  })

  it('invites_by_github_login_without_the_at_sign_and_lists_the_answer', async () => {
    const server = new FakeApiServer()
    const invite = { id: 'invite-9', githubLogin: 'octocat', createdAt: 5 }
    server.json('POST', invitesPath(org), { invite }, 201)
    const { store } = await loadedStore(server)
    expect(await store.invite(' @octocat ')).toBe(true)
    expect(await server.requests.at(-1)?.json()).toEqual({
      githubLogin: 'octocat',
    })
    expect(ready(store).data.invites.map((item) => item.githubLogin)).toEqual([
      'mira-k',
      'octocat',
    ])
  })

  it('shows_the_role_that_the_api_answers_with', async () => {
    const server = new FakeApiServer()
    const { store } = await loadedStore(server)
    const jonas = ready(store).data.members[2]
    server.json('PATCH', memberPath(org, 'jonas'), {
      member: { ...jonas, role: 'admin' },
    })
    expect(await store.changeRole('jonas', 'admin')).toBe(true)
    expect(roles(store)).toEqual([
      ['cal', 'admin'],
      ['priya', 'member'],
      ['jonas', 'admin'],
    ])
  })
})
