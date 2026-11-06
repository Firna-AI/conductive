import type { OrgRole } from '../shared/api'
import type { OrgInvite, OrgMember } from '../shared/members'
import { errorMessage, type MembersApi } from './api/client'
import { countOwners } from './people'

export type MembersData = {
  members: readonly OrgMember[]
  invites: readonly OrgInvite[]
  /** The number of workspaces that each member owns, by user ID. */
  owned: Readonly<Record<string, number>>
}

export type MembersAction = 'invite' | 'role' | 'remove' | 'cancel'

/** A change that failed: its action, its member or invite, and the reason. */
export type MembersFailure = {
  action: MembersAction
  target: string
  message: string
}

type Ready = {
  status: 'ready'
  data: MembersData
  /** The changes that run now, as `pendingKey` gives them. */
  pending: readonly string[]
  failure: MembersFailure | null
}

export type MembersState =
  { status: 'loading' } | { status: 'failed'; message: string } | Ready

/** The members of one org, as the Members tab shows and changes them. */
export type MembersStore = {
  getState(): MembersState
  subscribe(listener: () => void): () => void
  load(): Promise<void>
  /** Resolves to true when the invite went out. */
  invite(email: string): Promise<boolean>
  cancelInvite(inviteId: string): Promise<boolean>
  changeRole(userId: string, role: OrgRole): Promise<boolean>
  /** Resolves to true when the member left the org. */
  remove(userId: string): Promise<boolean>
  clearFailure(): void
}

/** The key of a change that runs, such as "remove:priya". */
export function pendingKey(action: MembersAction, target: string): string {
  return `${action}:${target}`
}

/** Whether a change of this kind runs now, for any member or invite. */
export function runsAction(
  pending: readonly string[],
  action: MembersAction,
): boolean {
  return pending.some((key) => key.startsWith(`${action}:`))
}

/**
 * An email as the API takes it: without the spaces at its ends. The API
 * compares the emails of invites without case, so the app sends the case
 * as typed.
 */
export function normalizeEmail(value: string): string {
  return value.trim()
}

/**
 * Removes a member. Their workspaces move to the admin who removes them,
 * as decision 39 says, so the count of that admin grows.
 */
function withoutMember(
  data: MembersData,
  userId: string,
  adminId: string,
): MembersData {
  const owned: Record<string, number> = { ...data.owned }
  const moved = owned[userId] ?? 0
  delete owned[userId]
  if (moved > 0) owned[adminId] = (owned[adminId] ?? 0) + moved
  return {
    ...data,
    members: data.members.filter((member) => member.user.id !== userId),
    owned,
  }
}

/**
 * The state of the Members tab of one org. `viewerId` is the signed-in
 * admin, who gets the workspaces of each member that they remove. Each
 * change applies the API's answer, and a failed change keeps the list.
 */
export function createMembersStore(
  api: MembersApi,
  orgId: string,
  viewerId: string,
): MembersStore {
  let state: MembersState = { status: 'loading' }
  let loads = 0
  const listeners = new Set<() => void>()

  function set(next: MembersState) {
    state = next
    for (const listener of listeners) listener()
  }
  function update(change: (ready: Ready) => Ready) {
    if (state.status === 'ready') set(change(state))
  }

  async function run<T>(
    action: MembersAction,
    target: string,
    request: () => Promise<T>,
    apply: (data: MembersData, result: T) => MembersData,
  ): Promise<boolean> {
    const key = pendingKey(action, target)
    if (state.status !== 'ready' || state.pending.includes(key)) return false
    update((ready) => ({
      ...ready,
      pending: [...ready.pending, key],
      failure: null,
    }))
    const done = (pending: readonly string[]) =>
      pending.filter((item) => item !== key)
    try {
      const result = await request()
      update((ready) => ({
        ...ready,
        data: apply(ready.data, result),
        pending: done(ready.pending),
      }))
      return true
    } catch (error) {
      update((ready) => ({
        ...ready,
        pending: done(ready.pending),
        failure: { action, target, message: errorMessage(error) },
      }))
      return false
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async load() {
      const current = ++loads
      if (state.status !== 'loading') set({ status: 'loading' })
      try {
        const [members, workspaces] = await Promise.all([
          api.members(orgId),
          api.workspaces(orgId),
        ])
        if (current !== loads) return
        set({
          status: 'ready',
          data: {
            members: members.members,
            invites: members.invites,
            owned: countOwners(workspaces.workspaces),
          },
          pending: [],
          failure: null,
        })
      } catch (error) {
        if (current === loads)
          set({ status: 'failed', message: errorMessage(error) })
      }
    },
    async invite(typed) {
      const email = normalizeEmail(typed)
      if (!email) return false
      return run(
        'invite',
        email,
        () => api.invite(orgId, { email }),
        (data, invite) => ({
          ...data,
          invites: [
            ...data.invites.filter((item) => item.id !== invite.id),
            invite,
          ],
        }),
      )
    },
    cancelInvite: (inviteId) =>
      run(
        'cancel',
        inviteId,
        () => api.cancelInvite(orgId, inviteId),
        (data) => ({
          ...data,
          invites: data.invites.filter((item) => item.id !== inviteId),
        }),
      ),
    changeRole: (userId, role) =>
      run(
        'role',
        userId,
        () => api.changeRole(orgId, userId, { role }),
        (data, changed) => ({
          ...data,
          members: data.members.map((member) =>
            member.user.id === changed.user.id ? changed : member,
          ),
        }),
      ),
    remove: (userId) =>
      run(
        'remove',
        userId,
        () => api.removeMember(orgId, userId),
        (data) => withoutMember(data, userId, viewerId),
      ),
    clearFailure() {
      update((ready) => ({ ...ready, failure: null }))
    },
  }
}
