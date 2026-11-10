import { Ban, Trash2 } from 'lucide-react'
import type { OrgMember } from '../../fixtures/operatorDirectory'
import type { OrgPage } from '../../fixtures/operatorPages'
import { paths } from '../../paths'
import { Notice } from '../common/Notice'
import { DetailList } from '../settings/DetailList'
import { Section } from '../settings/Section'
import { TargetState } from './directory'
import {
  deletedOrgBody,
  suspendedOrgBody,
  suspendedTitle,
} from './operatorCopy'
import { TargetList, TargetRow } from './targets'
import { WorkspaceStates } from './WorkspaceStates'

/**
 * The notices of a suspended or a deleted org, at the top of its page. An
 * org can be both, so the page can show both.
 */
function OrgNotices(props: { org: OrgPage }) {
  const { org } = props
  const { suspension, deleted } = org
  const deletion = deleted ? { purge: deleted.purge } : null
  return (
    <>
      {suspension ? (
        <Notice
          body={suspendedOrgBody(org.name, suspension.stopping, deletion)}
          icon={Ban}
          title={suspendedTitle(suspension.since, suspension.by)}
        />
      ) : null}
      {deleted ? (
        <Notice
          body={deletedOrgBody(
            org.name,
            { purge: deleted.purge },
            suspension !== undefined,
          )}
          icon={Trash2}
          title={`Deleted on ${deleted.on}`}
        />
      ) : null}
    </>
  )
}

/**
 * The line under a login: the name on GitHub, and the state of a
 * suspended member.
 */
function MemberLine(props: { member: OrgMember }) {
  const { name, suspended } = props.member
  return (
    <>
      {name}
      {name && suspended ? ' · ' : null}
      {suspended ? <TargetState status="suspended" /> : null}
    </>
  )
}

/**
 * The page of a member: the suspended user, the member who came in by an
 * org invitation, or the page of a user in use.
 */
function memberPage(member: OrgMember): string {
  if (member.suspended) return paths.operatorUserSuspended
  if (member.login === 'kt-null') return paths.operatorUserOrgInvitation
  return paths.operatorUser
}

function MemberRow(props: { member: OrgMember }) {
  const { member } = props
  return (
    <TargetRow
      detail={
        member.name || member.suspended ? (
          <MemberLine member={member} />
        ) : undefined
      }
      end={member.role}
      target={{ kind: 'user', name: member.login, initials: member.initials }}
      to={memberPage(member)}
    />
  )
}

/**
 * The page of an org for the operator: its state, its details, its
 * workspaces in each state, and its members with their names and roles.
 * Each member opens the page of that user.
 */
export function OrgDetails(props: { org: OrgPage }) {
  const { org } = props
  const members = org.members.length
  return (
    <>
      <OrgNotices org={org} />
      <Section title="Details">
        <DetailList
          rows={[
            { term: 'Org ID', value: org.id, mono: true },
            { term: 'Created', value: org.created },
            { term: 'Repositories', value: String(org.repositories) },
          ]}
        />
      </Section>
      <WorkspaceStates builds={org.builds} counts={org.states} page="org" />
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
