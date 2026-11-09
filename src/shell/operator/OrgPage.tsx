import { Ban, Trash2 } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  deletedOrgBody,
  suspendedOrgBody,
  type OrgDeletion,
  type QuestionTarget,
} from '../../../docs/mockups/src/components/operator/operatorCopy'
import { WorkspaceStates } from '../../../docs/mockups/src/components/operator/WorkspaceStates'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { readOperatorOrg } from '../../app/api/read-operator-pages'
import { OperatorTarget } from '../../app/operator-target'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { roleLabels } from '../../members/people'
import {
  operatorOrgPath,
  orgSuspensionPath,
  type OperatorOrgDetail,
  type OperatorOrgMember,
} from '../../shared/operator'
import { useApp } from '../context'
import { Loaded } from '../settings/LoadState'
import { counted, formatCount, formatLongDay, formatShortDay } from './format'
import { OperatorPage } from './OperatorPage'
import { LiftDialog, SuspendDialog } from './TargetDialogs'
import { suspensionTitle, TargetAction, useTargetPage } from './TargetPage'
import { Joined, TargetList, TargetRow, TargetState } from './TargetParts'

/**
 * The deletion of an org, with the day when everything of it is deleted, as
 * the page writes it, or `null` when no admin deleted the org.
 */
function useDeletion(org: OperatorOrgDetail | null): OrgDeletion | null {
  const { now, timeZone } = useServices()
  if (!org?.deletion) return null
  const { purgeAt } = org.deletion
  return {
    purge: purgeAt === null ? null : formatShortDay(purgeAt, now(), timeZone),
  }
}

/**
 * The notices of a suspended or a deleted org, at the top of its page. An org
 * can be both, so the page can show both. The texts of a deleted org claim
 * nothing that its members can open, and a suspension stops its restore.
 */
function OrgNotices(props: {
  org: OperatorOrgDetail
  stopping: number | null
}) {
  const { org } = props
  const { now, timeZone } = useServices()
  const deletion = useDeletion(org)
  const today = now()
  return (
    <>
      {org.suspension ? (
        <Notice
          body={suspendedOrgBody(org.name, props.stopping ?? 0, deletion)}
          icon={Ban}
          title={suspensionTitle(org.suspension, today, timeZone)}
        />
      ) : null}
      {org.deletion && deletion ? (
        <Notice
          body={deletedOrgBody(org.name, deletion, org.suspension !== null)}
          icon={Trash2}
          title={`Deleted on ${formatShortDay(org.deletion.deletedAt, today, timeZone)}`}
        />
      ) : null}
    </>
  )
}

/** A member, with the name on GitHub and the state of a suspended member. */
function MemberRow(props: { member: OperatorOrgMember }) {
  const { member } = props
  const state = member.suspended ? <TargetState status="suspended" /> : null
  return (
    <TargetRow
      detail={
        member.name || state ? (
          <Joined parts={[member.name, state]} />
        ) : undefined
      }
      end={roleLabels[member.role]}
      target={{ kind: 'user', login: member.login, name: member.name }}
      to={routes.operatorUser(member.githubId)}
    />
  )
}

/**
 * The page of an org for the operator: its state, its details, its workspaces
 * in each state, and its members with their names and roles. Each member opens
 * the page of that user.
 */
function OrgDetails(props: {
  org: OperatorOrgDetail
  stopping: number | null
}) {
  const { org } = props
  const { timeZone } = useServices()
  return (
    <>
      <OrgNotices org={org} stopping={props.stopping} />
      <Section title="Details">
        <DetailList
          rows={[
            { term: 'Org ID', value: org.id, mono: true },
            { term: 'Created', value: formatLongDay(org.createdAt, timeZone) },
            { term: 'Repositories', value: formatCount(org.repositories) },
          ]}
        />
      </Section>
      <WorkspaceStates
        builds={org.running.builds}
        counts={org.workspaceStates}
        page="org"
      />
      <Section
        description={counted(org.members.length, 'member', 'members')}
        title="Members"
      >
        {org.members.length > 0 ? (
          <TargetList label={`Members of ${org.name}`}>
            {org.members.map((member) => (
              <MemberRow key={member.githubId} member={member} />
            ))}
          </TargetList>
        ) : null}
      </Section>
    </>
  )
}

/**
 * The page of one org, from the Orgs tab or a link, with Suspend, or Lift for a
 * suspended org. A deleted org still has Suspend. After either, the page reads
 * the org again.
 */
export function OrgPage(props: { orgId: string }) {
  const app = useApp()
  const page = useTargetPage(
    () =>
      new OperatorTarget(
        app,
        {
          page: operatorOrgPath(props.orgId),
          suspension: orgSuspensionPath(props.orgId),
        },
        readOperatorOrg,
      ),
  )
  const { target, detail, question, ask } = page
  const org = detail.state === 'ready' ? detail.value : null
  const deletion = useDeletion(org)
  const named: QuestionTarget | null = org
    ? { kind: 'org', name: org.name, deletion }
    : null
  const close = () => ask(null)
  return (
    <OperatorPage
      actions={
        org ? (
          <TargetAction
            ask={ask}
            kind="org"
            suspended={org.suspension !== null}
          />
        ) : undefined
      }
      back={{ label: 'Orgs', to: routes.operatorOrgs() }}
      subtitle={org ? 'Org' : undefined}
      tab="orgs"
      title={org?.name ?? 'Org'}
    >
      <Loaded
        failure="The org could not load"
        retry={() => target.detail.refresh()}
        value={detail}
      >
        {(value) => <OrgDetails org={value} stopping={page.stopping} />}
      </Loaded>
      {named && question === 'suspend' ? (
        <SuspendDialog
          close={close}
          self={false}
          suspend={() => target.suspend()}
          target={named}
        />
      ) : null}
      {named && question === 'lift' ? (
        <LiftDialog close={close} lift={() => target.lift()} target={named} />
      ) : null}
    </OperatorPage>
  )
}
