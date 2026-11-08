import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { CircleAlert } from 'lucide-react'
import type { Org } from '../shared/api'
import type { OrgMember } from '../shared/members'
import type { MembersApi } from './api/client'
import { InviteSection } from './InviteSection'
import { MemberList } from './MemberList'
import {
  createMembersStore,
  pendingKey,
  type MembersData,
  type MembersFailure,
  type MembersFailures,
  type MembersStore,
} from './membersStore'
import { personName } from './people'
import { RemoveMemberDialog } from './RemoveMemberDialog'
import { useMountedRef } from './useMounted'
import { ViewportScope, type Viewport } from './ui/controls'
import { Loading, LoadFailure } from './ui/Loading'
import { Notice } from './ui/Notice'
import { Section } from './ui/Section'

const description =
  'Admins manage the members and who owns each workspace. Members work in the workspaces.'

function useMembers(api: MembersApi, orgId: string, viewerId: string) {
  const store = useMemo(
    () => createMembersStore(api, orgId, viewerId),
    [api, orgId, viewerId],
  )
  useEffect(() => {
    void store.load()
  }, [store])
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  )
  return { store, state }
}

/** The failure of a role change or of a cancelled invite, as a notice title. */
function failureTitle(data: MembersData, failure: MembersFailure): string {
  if (failure.action === 'role') {
    const member = data.members.find((item) => item.user.id === failure.target)
    return member
      ? `The role of ${personName(member.user)} did not change`
      : 'The role did not change'
  }
  const invite = data.invites.find((item) => item.id === failure.target)
  return invite
    ? `The invite to ${invite.email} is still open`
    : 'The invite is still open'
}

function ReadyMembers(props: {
  store: MembersStore
  data: MembersData
  pending: readonly string[]
  failures: MembersFailures
  viewerId: string
  canManage: boolean
  now: number
  onRemove: (member: OrgMember) => void
}) {
  const { store } = props
  // Each failed role change and cancel shows its own notice. The answer of
  // another change keeps it.
  const listFailures = [...props.failures.values()].filter(
    (failure) => failure.action === 'role' || failure.action === 'cancel',
  )
  return (
    <>
      {listFailures.map((failure) => (
        <Notice
          body={failure.message}
          icon={CircleAlert}
          key={pendingKey(failure.action, failure.target)}
          title={failureTitle(props.data, failure)}
          tone="danger"
        />
      ))}
      <MemberList
        canManage={props.canManage}
        invites={props.data.invites}
        members={props.data.members}
        now={props.now}
        onCancelInvite={(invite) => void store.cancelInvite(invite.id)}
        onChangeRole={(userId, role) => void store.changeRole(userId, role)}
        onRemove={props.onRemove}
        owned={props.data.owned}
        pending={props.pending}
        viewerId={props.viewerId}
      />
    </>
  )
}

export type MembersTabProps = {
  api: MembersApi
  /** The org, with the role of the signed-in person. */
  org: Org
  /** The user ID of the signed-in person. */
  viewerId: string
  viewport: Viewport
  /** The time now, in Unix milliseconds, for the age of each invite. */
  now: number
  /** A member left the org. Their workspaces now belong to the viewer. */
  onMemberRemoved?: (member: OrgMember) => void
  /**
   * The org is suspended, so nothing in it changes, also for an admin. The
   * tab shows the members and their roles without actions and invites.
   */
  suspended?: boolean
}

/**
 * The Members tab of the org settings. An admin invites a person by email,
 * changes the role of another member, removes another member, and cancels
 * an invite. A member who is not an admin sees the members, their roles,
 * and their workspaces, without those actions. Mount it in the page column
 * of the org settings, which spaces its two sections.
 *
 * The tab keys its state to the org, the viewer's role, the viewer, and the
 * suspension of the org. When one of them changes, it loads the members
 * again, and an open question, a typed email, and an error go. Old answers
 * then call no callback.
 */
export function MembersTab(props: MembersTabProps) {
  const { org, viewerId } = props
  const suspended = props.suspended ?? false
  return (
    <OrgMembersTab
      key={`${org.id}/${org.role}/${viewerId}/${suspended}`}
      {...props}
    />
  )
}

function OrgMembersTab(props: MembersTabProps) {
  const { store, state } = useMembers(props.api, props.org.id, props.viewerId)
  const mounted = useMountedRef()
  const canManage = props.org.role === 'admin' && !props.suspended
  const ready = state.status === 'ready' ? state : null
  // The store holds the open question, so an answer for another member
  // leaves it as it is.
  const removing =
    ready?.data.members.find((member) => member.user.id === ready.removing) ??
    null

  async function confirmRemove(member: OrgMember) {
    const removed = await store.remove(member.user.id)
    if (removed && mounted.current) props.onMemberRemoved?.(member)
  }

  return (
    <ViewportScope viewport={props.viewport}>
      {canManage ? <InviteSection state={state} store={store} /> : null}
      <Section description={description} title="Members">
        {state.status === 'loading' ? (
          <Loading label="Loading the members" />
        ) : null}
        {state.status === 'failed' ? (
          <LoadFailure
            message={state.message}
            onRetry={() => void store.load()}
            title="The members did not load"
          />
        ) : null}
        {ready ? (
          <ReadyMembers
            canManage={canManage}
            data={ready.data}
            failures={ready.failures}
            now={props.now}
            onRemove={(member) => store.openRemoval(member.user.id)}
            pending={ready.pending}
            store={store}
            viewerId={props.viewerId}
          />
        ) : null}
      </Section>
      {canManage && ready && removing ? (
        <RemoveMemberDialog
          busy={ready.pending.includes(pendingKey('remove', removing.user.id))}
          error={
            ready.failures.get(pendingKey('remove', removing.user.id))
              ?.message ?? null
          }
          member={removing}
          onCancel={() => store.closeRemoval(removing.user.id)}
          onConfirm={() => void confirmRemove(removing)}
          orgName={props.org.name}
          owned={ready.data.owned[removing.user.id] ?? 0}
        />
      ) : null}
    </ViewportScope>
  )
}
