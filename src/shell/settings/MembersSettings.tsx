import { useNow } from '../../app/time'
import { MembersTab } from '../../members/MembersTab'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { useMembersApi, useMembersViewport } from './members-api'

/**
 * The Members tab of the org settings. An admin invites a person by email,
 * changes the role of another member, removes another member, and cancels
 * an invite. A member who is not an admin sees the members without those
 * actions. A removal moves the workspaces of the member to the viewer, so
 * the list of the org and its members read again.
 */
export function MembersSettings(props: { org: OrgSummary; user: User }) {
  const model = useOrgModel(props.org.id)
  const now = useNow(60_000)
  return (
    <MembersTab
      api={useMembersApi()}
      now={now}
      onMemberRemoved={() => {
        void model.reload('list')
        void model.reload('members')
      }}
      org={props.org}
      viewerId={props.user.id}
      viewport={useMembersViewport()}
    />
  )
}
