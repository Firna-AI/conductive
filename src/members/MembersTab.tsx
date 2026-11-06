import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CircleAlert } from 'lucide-react'
import type { Org } from '../shared/api'
import type { OrgMember } from '../shared/members'
import type { MembersApi } from './api/client'
import { InviteSection } from './InviteSection'
import { MemberList } from './MemberList'
import {
  createMembersStore,
  pendingKey,
  type MembersFailure,
  type MembersData,
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
    ? `The invite to @${invite.githubLogin} is still open`
    : 'The invite is still open'
}

function ReadyMembers(props: {
  store: MembersStore
  data: MembersData
  pending: readonly string[]
  failure: MembersFailure | null
  viewerId: string
  canManage: boolean
  now: number
  onRemove: (member: OrgMember) => void
}) {
  const { failure, store } = props
  const listFailure =
    failure?.action === 'role' || failure?.action === 'cancel' ? failure : null
  return (
    <>
      {listFailure ? (
        <Notice
          body={listFailure.message}
          icon={CircleAlert}
          title={failureTitle(props.data, listFailure)}
          tone="danger"
        />
      ) : null}
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
}

/**
 * The Members tab of the org settings. An admin invites a person by GitHub
 * login, changes the role of another member, removes another member, and
 * cancels an invite. A member who is not an admin sees the members, their
 * roles, and their workspaces, without those actions. Mount it in the page
 * column of the org settings, which spaces its two sections.
 *
 * The tab keys its state to the org, the viewer's role, and the viewer. When
 * one of them changes, it loads the members again, and an open question,
 * a typed login, and an error go. Old answers then call no callback.
 */
export function MembersTab(props: MembersTabProps) {
  const { org, viewerId } = props
  return <OrgMembersTab key={`${org.id}/${org.role}/${viewerId}`} {...props} />
}

function OrgMembersTab(props: MembersTabProps) {
  const { store, state } = useMembers(props.api, props.org.id, props.viewerId)
  const mounted = useMountedRef()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const canManage = props.org.role === 'admin'
  const ready = state.status === 'ready' ? state : null
  const removing =
    ready?.data.members.find((member) => member.user.id === removingId) ?? null

  async function confirmRemove(member: OrgMember) {
    const removed = await store.remove(member.user.id)
    if (removed && mounted.current) {
      setRemovingId(null)
      props.onMemberRemoved?.(member)
    }
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
            failure={ready.failure}
            now={props.now}
            onRemove={(member) => {
              store.clearFailure()
              setRemovingId(member.user.id)
            }}
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
            ready.failure?.action === 'remove' &&
            ready.failure.target === removing.user.id
              ? ready.failure.message
              : null
          }
          member={removing}
          onCancel={() => setRemovingId(null)}
          onConfirm={() => void confirmRemove(removing)}
          orgName={props.org.name}
          owned={ready.data.owned[removing.user.id] ?? 0}
        />
      ) : null}
    </ViewportScope>
  )
}
