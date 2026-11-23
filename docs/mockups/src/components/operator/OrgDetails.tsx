import type { OrgMember } from '../../fixtures/operatorDirectory'
import type { OrgPage } from '../../fixtures/operatorPages'
import { paths } from '../../paths'
import { notice } from '../../entries/components/common/Notice.mockup'
import { detailList } from '../../entries/components/settings/DetailList.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { AccountSection } from './AccountSection'
import { TargetState } from './directory'
import {
  deletedOrgBody,
  suspendedOrgBody,
  suspendedTitle,
} from '../../../../../src/ui/components/operator/operatorCopy'
import { TargetList, TargetRow } from './targets'
import { WorkspaceStates } from '../../../../../src/ui/components/operator/WorkspaceStates'
import { instanceKey } from '../../instanceKey'
import { defined } from '../../defined'

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
        <notice.Component
          icon="ban"
          {...defined({
            // A deleted org with no workspace that stops has no body.
            body:
              suspendedOrgBody(org.name, suspension.stopping, deletion) ||
              undefined,
          })}
          moklyInstance="suspended-notice"
          title={suspendedTitle(suspension.since, suspension.by)}
        />
      ) : null}
      {deleted ? (
        <notice.Component
          body={deletedOrgBody(
            org.name,
            { purge: deleted.purge },
            suspension !== undefined,
          )}
          icon="trash-2"
          moklyInstance="deleted-notice"
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
  const { login, name, suspended } = props.member
  return (
    <>
      {name}
      {name && suspended ? ' · ' : null}
      {suspended ? (
        <TargetState id={instanceKey(login)} status="suspended" />
      ) : null}
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
 * provider account by its ID with the switch of the account, its
 * workspaces in each state, and its members with their names and roles.
 * Each member opens the page of that user.
 */
export function OrgDetails(props: {
  org: OrgPage
  /** The question of the action of the account box, for the page that draws it. */
  accountTo?: string
}) {
  const { org } = props
  const members = org.members.length
  return (
    <>
      <OrgNotices org={org} />
      <section.Component moklyInstance="details-section" title="Details">
        <detailList.Component
          moklyInstance="org-details-list"
          rows={[
            { term: 'Org ID', value: org.id, mono: true },
            { term: 'Created', value: org.created },
            { term: 'Repositories', value: String(org.repositories) },
          ]}
        />
      </section.Component>
      <AccountSection
        account={org.account}
        last={org.lastSwitch}
        org={org.name}
        switch={org.switch}
        to={props.accountTo}
        workspaces={org.byAccount}
      />
      <WorkspaceStates
        builds={{ count: org.builds, page: 'org' }}
        counts={org.states}
      />
      <section.Component
        description={`${members} ${members === 1 ? 'member' : 'members'}`}
        moklyInstance="members-section"
        title="Members"
      >
        <TargetList label={`Members of ${org.name}`}>
          {org.members.map((member) => (
            <MemberRow key={member.login} member={member} />
          ))}
        </TargetList>
      </section.Component>
    </>
  )
}
