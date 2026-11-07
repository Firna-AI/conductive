import { describe, expect, it } from 'vitest'
import { invitesPath, memberPath } from '../shared/members'
import { FakeApiServer } from '../test-support/fake-api'
import type { FakeMethod } from '../test-support/fake-api-routes'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { deferred, type Deferred } from '../test-support/mount'
import { createMembersApi, type FetchLike } from './api/client'
import {
  createMembersStore,
  pendingKey,
  type MembersAction,
  type MembersStore,
} from './membersStore'

const org = FAKE_IDS.org

/** The fake's org has Cal (admin), Priya, and Jonas, with 6, 2, and 1 workspaces. */
async function loadedStore(
  server = new FakeApiServer(),
  fetch: FetchLike = server.fetch,
) {
  const store = createMembersStore(createMembersApi(fetch), org, 'cal')
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

/** The failures of the store, by pending key. */
function failures(store: MembersStore) {
  return Object.fromEntries(ready(store).failures)
}

/** One expected failure, by its pending key. */
function failed(action: MembersAction, target: string, message: string) {
  return { [pendingKey(action, target)]: { action, target, message } }
}

/** The fake's replies to this request fail with the message. */
function fails(
  server: FakeApiServer,
  method: FakeMethod,
  path: string,
  message: string,
) {
  server.json(method, path, { error: { code: 'internal_error', message } }, 500)
}

/**
 * A fetch that holds the replies to each held request until the test
 * releases them, so the test chooses the order of the replies.
 */
function holdingFetch(server: FakeApiServer) {
  const held = new Map<string, Deferred<void>>()
  const fetch: FetchLike = async (path, init) => {
    await held.get(`${init?.method} ${path}`)?.promise
    return server.fetch(path, init)
  }
  function hold(method: FakeMethod, path: string): Deferred<void> {
    const reply = deferred()
    held.set(`${method} ${path}`, reply)
    return reply
  }
  return { fetch, hold }
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
    fails(server, 'DELETE', memberPath(org, 'priya'), message)
    const { store } = await loadedStore(server)
    expect(await store.remove('priya')).toBe(false)
    expect(roles(store)).toEqual([
      ['cal', 'admin'],
      ['priya', 'member'],
      ['jonas', 'member'],
    ])
    expect(ready(store).data.owned).toEqual({ cal: 6, priya: 2, jonas: 1 })
    expect(failures(store)).toEqual(failed('remove', 'priya', message))
    expect(ready(store).pending).toEqual([])
  })

  it('a_removal_changes_only_its_own_member_in_either_reply_order', async () => {
    const orders = [
      ['priya', 'jonas'],
      ['jonas', 'priya'],
    ] as const
    for (const order of orders) {
      const server = new FakeApiServer()
      fails(server, 'PATCH', memberPath(org, 'priya'), 'Priya keeps her role.')
      fails(server, 'DELETE', memberPath(org, 'jonas'), 'Jonas stays.')
      const { fetch, hold } = holdingFetch(server)
      const replies = {
        priya: hold('DELETE', memberPath(org, 'priya')),
        jonas: hold('DELETE', memberPath(org, 'jonas')),
      }
      const { store } = await loadedStore(server, fetch)
      expect(await store.changeRole('priya', 'admin')).toBe(false)
      // Priya's question closes while her removal runs, and Jonas's question
      // opens. A late close of Priya's question leaves his question open.
      store.openRemoval('priya')
      const priya = store.remove('priya')
      store.closeRemoval('priya')
      store.openRemoval('jonas')
      store.closeRemoval('priya')
      const removals = { priya, jonas: store.remove('jonas') }
      const results: Record<string, boolean> = {}
      for (const id of order) {
        replies[id].resolve()
        results[id] = await removals[id]
      }
      expect({
        order,
        results,
        members: roles(store),
        removing: ready(store).removing,
        failures: failures(store),
      }).toEqual({
        order,
        results: { priya: true, jonas: false },
        members: [
          ['cal', 'admin'],
          ['jonas', 'member'],
        ],
        removing: 'jonas',
        failures: failed('remove', 'jonas', 'Jonas stays.'),
      })
    }
  })

  it('other_changes_keep_the_failure_of_the_open_removal_question', async () => {
    const server = new FakeApiServer()
    fails(server, 'PATCH', memberPath(org, 'priya'), 'Priya keeps her role.')
    fails(server, 'DELETE', memberPath(org, 'jonas'), 'Jonas stays.')
    fails(server, 'POST', invitesPath(org), 'The invite did not go out.')
    const { fetch, hold } = holdingFetch(server)
    const roleReply = hold('PATCH', memberPath(org, 'priya'))
    const { store } = await loadedStore(server, fetch)
    // A role change runs while the removal of Jonas fails.
    const roleChange = store.changeRole('priya', 'admin')
    store.openRemoval('jonas')
    expect(await store.remove('jonas')).toBe(false)
    roleReply.resolve()
    expect(await roleChange).toBe(false)
    expect(await store.invite('ana@example.com')).toBe(false)
    expect(await store.cancelInvite('invite-0')).toBe(true)
    const others = {
      ...failed('role', 'priya', 'Priya keeps her role.'),
      ...failed('invite', 'ana@example.com', 'The invite did not go out.'),
    }
    expect({
      removing: ready(store).removing,
      failures: failures(store),
    }).toEqual({
      removing: 'jonas',
      failures: { ...failed('remove', 'jonas', 'Jonas stays.'), ...others },
    })
    // The question opens again without its own failure. The others stay.
    store.closeRemoval('jonas')
    store.openRemoval('jonas')
    expect({
      removing: ready(store).removing,
      failures: failures(store),
    }).toEqual({ removing: 'jonas', failures: others })
  })

  it('invites_by_email_without_the_spaces_at_its_ends_and_lists_the_answer', async () => {
    const server = new FakeApiServer()
    const invite = { id: 'invite-9', email: 'ana@example.com', createdAt: 5 }
    server.json('POST', invitesPath(org), { invite }, 201)
    const { store } = await loadedStore(server)
    expect(await store.invite(' ana@example.com ')).toBe(true)
    expect(await server.requests.at(-1)?.json()).toEqual({
      email: 'ana@example.com',
    })
    expect(ready(store).data.invites.map((item) => item.email)).toEqual([
      'mira@example.com',
      'ana@example.com',
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
