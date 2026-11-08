import { Ban, Trash2 } from 'lucide-react'
import type { OrgMember } from '../../fixtures/operatorDirectory'
import type { OrgPage } from '../../fixtures/operatorPages'
import { paths } from '../../paths'
import { Notice } from '../common/Notice'
import { DetailList } from '../settings/DetailList'
import { Section } from '../settings/Section'
import { TargetList, TargetRow } from './targets'
import { WorkspaceStates } from './WorkspaceStates'

/** The notice of a suspended or a deleted org, at the top of its page. */
function OrgNotice(props: { org: OrgPage }) {
  const { org } = props
  if (org.suspension) {
    const { since, by, stopping } = org.suspension
    const pending =
      stopping > 0
        ? ` ${stopping} cloud computers are still stopping, and each keeps trying on its own.`
        : ''
    return (
      <Notice
        body={`Members can open and read ${org.name}, but cannot change it or start a workspace.${pending}`}
        icon={Ban}
        title={`Suspended on ${since} by @${by}`}
      />
    )
  }
  if (org.deleted) {
    return (
      <Notice
        body={`Everything of ${org.name} is deleted on ${org.deleted.purge}, unless an admin restores it.`}
        icon={Trash2}
        title={`Deleted on ${org.deleted.on}`}
      />
    )
  }
  return null
}

function MemberRow(props: { member: OrgMember }) {
  const { member } = props
  return (
    <TargetRow
      detail={member.suspended ? 'Suspended' : undefined}
      end={member.role}
      target={{ kind: 'user', name: member.login, initials: member.initials }}
      to={member.suspended ? paths.operatorUserSuspended : paths.operatorUser}
    />
  )
}

/**
 * The page of an org for the operator: its state, its details, its
 * workspaces in each state, and its members with their roles. Each member
 * opens the page of that user.
 */
export function OrgDetails(props: { org: OrgPage }) {
  const { org } = props
  const members = org.members.length
  return (
    <>
      <OrgNotice org={org} />
      <Section title="Details">
        <DetailList
          rows={[
            { term: 'Org ID', value: org.id, mono: true },
            { term: 'Created', value: org.created },
            { term: 'Repositories', value: String(org.repositories) },
          ]}
        />
      </Section>
      <WorkspaceStates builds={org.builds} counts={org.states} />
      <Section
        description={`${members} ${members === 1 ? 'member' : 'members'}`}
        title="Members"
      >
        <TargetList label={`Members of ${org.name}`}>
          {org.members.map((member) => (
            <MemberRow key={member.login} member={member} />
          ))}
        </TargetList>
      </Section>
    </>
  )
}
