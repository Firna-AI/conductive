import { InputFrame } from '@firna/ui/input'
import { Mail } from 'lucide-react'
import type { Invite, Membership, PersonKey } from '../../fixtures/members'
import type { Workspace } from '../../fixtures/workspaces'
import { noop } from '../../../../../src/ui/noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { section } from '../../entries/components/settings/Section.mockup'
import { memberList } from '../../entries/components/members/MemberList.mockup'
import styles from '../../../../../src/ui/components/members/Members.module.css'

/**
 * The invite of an admin, by email. The person joins with a GitHub account
 * that has that email verified, when they accept.
 */
function InviteSection() {
  const { field } = useControlSizes()
  return (
    <section.Component
      description="Invite a person by an email that is verified on their GitHub account. They join when they accept."
      moklyInstance="invite"
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
        <actionButton.Component icon="user-plus" moklyInstance="invite-member">
          Invite
        </actionButton.Component>
      </div>
    </section.Component>
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
      <section.Component
        description="Admins manage the members and who owns each workspace. Members work in the workspaces."
        moklyInstance="members"
        title="Members"
      >
        <memberList.Component
          canManage={props.canManage}
          invites={props.canManage ? props.invites : []}
          members={props.members}
          moklyInstance="member-list"
          viewer={props.viewer}
          workspaces={props.workspaces}
        />
      </section.Component>
    </>
  )
}
