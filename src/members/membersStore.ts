import type { OrgRole } from '../shared/api'
import type { OrgInvite, OrgMember } from '../shared/members'
import { keepExistingOwners } from './actionOwners'
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

/** The changes that failed, by `pendingKey`, in the order that they failed. */
export type MembersFailures = ReadonlyMap<string, MembersFailure>

type Ready = {
  status: 'ready'
  data: MembersData
  /** The changes that run now, as `pendingKey` gives them. */
  pending: readonly string[]
  /**
   * Each change sets and drops only its own failure. Another change's
   * answer keeps it. Running the same change or opening its removal
   * question drops its failure. A failure also goes when its member
   * or invite leaves the loaded list. New invitations have no existing
   * owner, so their failures stay.
   */
  failures: MembersFailures
  /** The member whose removal question is open, by user ID. */
  removing: string | null
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
  /** Opens the removal question of the member, without its last failure. */
  openRemoval(userId: string): void
  /** Closes the removal question of the member when it is the open one. */
  closeRemoval(userId: string): void
  /**
   * Resolves to true when the member left the org. Then the question and
   * the failures of that member go, and those of another member stay.
   */
  remove(userId: string): Promise<boolean>
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

/** The failures without the failure of one change. */
function without(failures: MembersFailures, key: string): MembersFailures {
  if (!failures.has(key)) return failures
  const next = new Map(failures)
  next.delete(key)
  return next
}

/**
 * Removes a member and moves their workspace count to the admin who
 * removes them.
 */
function withoutMember(ready: Ready, userId: string, adminId: string): Ready {
  const owned: Record<string, number> = { ...ready.data.owned }
  const moved = owned[userId] ?? 0
  delete owned[userId]
  if (moved > 0) owned[adminId] = (owned[adminId] ?? 0) + moved
  return {
    ...ready,
    data: {
      ...ready.data,
      members: ready.data.members.filter((member) => member.user.id !== userId),
      owned,
    },
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
    if (state.status !== 'ready') return
    const next = change(state)
    set({
      ...next,
      ...keepExistingOwners(next.data, next.failures, next.removing),
    })
  }

  async function run<T>(
    action: MembersAction,
    target: string,
    request: () => Promise<T>,
    apply: (ready: Ready, result: T) => Ready,
  ): Promise<boolean> {
    const key = pendingKey(action, target)
    if (state.status !== 'ready' || state.pending.includes(key)) return false
    update((ready) => ({
      ...ready,
      pending: [...ready.pending, key],
      failures: without(ready.failures, key),
    }))
    const done = (pending: readonly string[]) =>
      pending.filter((item) => item !== key)
    try {
      const result = await request()
      update((ready) => ({
        ...apply(ready, result),
        pending: done(ready.pending),
      }))
      return true
    } catch (error) {
      const failure = { action, target, message: errorMessage(error) }
      update((ready) => ({
        ...ready,
        pending: done(ready.pending),
        failures: new Map(ready.failures).set(key, failure),
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
          failures: new Map(),
          removing: null,
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
        (ready, invite) => ({
          ...ready,
          data: {
            ...ready.data,
            invites: [
              ...ready.data.invites.filter((item) => item.id !== invite.id),
              invite,
            ],
          },
        }),
      )
    },
    cancelInvite: (inviteId) =>
      run(
        'cancel',
        inviteId,
        () => api.cancelInvite(orgId, inviteId),
        (ready) => ({
          ...ready,
          data: {
            ...ready.data,
            invites: ready.data.invites.filter((item) => item.id !== inviteId),
          },
        }),
      ),
    changeRole: (userId, role) =>
      run(
        'role',
        userId,
        () => api.changeRole(orgId, userId, { role }),
        (ready, changed) => ({
          ...ready,
          data: {
            ...ready.data,
            members: ready.data.members.map((member) =>
              member.user.id === changed.user.id ? changed : member,
            ),
          },
        }),
      ),
    openRemoval(userId) {
      update((ready) => ({
        ...ready,
        removing: userId,
        failures: without(ready.failures, pendingKey('remove', userId)),
      }))
    },
    closeRemoval(userId) {
      update((ready) =>
        ready.removing === userId ? { ...ready, removing: null } : ready,
      )
    },
    remove: (userId) =>
      run(
        'remove',
        userId,
        () => api.removeMember(orgId, userId),
        (ready) => withoutMember(ready, userId, viewerId),
      ),
  }
}
