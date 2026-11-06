import { useEffect } from 'react'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { Loaded } from './LoadState'
import { MemberList } from './MemberList'

/**
 * The members of an org, with their roles and the workspaces that each one
 * owns. An admin also sees the open invites. Every member sees this tab
 * without actions for now: Milestone 15c adds the invite, the role change,
 * and the removal for an admin.
 */
export function MembersTab(props: { org: OrgSummary; user: User }) {
  const { org } = props
  const model = useOrgModel(org.id)
  const members = useStore(model.members)
  const workspaces = useStore(model.workspaces)
  useEffect(() => model.watch('members', 'list'), [model])
  return (
    <Section
      description="Admins manage the members and who owns each workspace. Members work in the workspaces."
      title="Members"
    >
      <Loaded
        failure="The members did not load"
        retry={() => model.reload('members')}
        value={members}
      >
        {(value) => (
          <MemberList
            admin={org.role === 'admin'}
            members={value}
            user={props.user}
            workspaces={valueOf(workspaces)}
          />
        )}
      </Loaded>
    </Section>
  )
}
