import { InputFrame } from '@firna/ui/input'
import { Mail, UserPlus } from 'lucide-react'
import type { Invite, Membership, PersonKey } from '../../fixtures/members'
import type { Workspace } from '../../fixtures/workspaces'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { Section } from '../settings/Section'
import { MemberList } from './MemberList'
import styles from './Members.module.css'

/**
 * The invite of an admin, by email. The person joins with a GitHub account
 * that has that email verified, when they accept.
 */
function InviteSection() {
  const { field } = useControlSizes()
  return (
    <Section
      description="Invite a person by an email that is verified on their GitHub account. They join when they accept."
      title="Invite a member"
    >
      <div className={styles.invite}>
        <InputFrame
          accessibilityLabel="Email"
          inputMode="email"
          onChangeText={noop}
          placeholder="Email"
          prefixIcon={Mail}
          size={field}
          value=""
        />
        <ActionButton icon={UserPlus}>Invite</ActionButton>
      </div>
    </Section>
  )
}

/**
 * The members of an org: an invite by email, then each member with
 * their role. Admins manage the members and who owns each workspace. A
 * member who is not an admin sees the members and their roles, without
 * the invite and without actions. `workspaces` are those of the org, with
 * their owners.
 */
export function MembersTab(props: {
  viewer: PersonKey
  canManage: boolean
  members: readonly Membership[]
  invites: readonly Invite[]
  workspaces: readonly Workspace[]
}) {
  return (
    <>
      {props.canManage ? <InviteSection /> : null}
      <Section
        description="Admins manage the members and who owns each workspace. Members work in the workspaces."
        title="Members"
      >
        <MemberList
          canManage={props.canManage}
          invites={props.canManage ? props.invites : []}
          members={props.members}
          viewer={props.viewer}
          workspaces={props.workspaces}
        />
      </Section>
    </>
  )
}
