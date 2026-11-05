import { InputFrame } from '@firna/ui/input'
import { AtSign, UserPlus } from 'lucide-react'
import {
  acmeInvites,
  acmeMembers,
  type PersonKey,
} from '../../fixtures/members'
import { workspaceList } from '../../fixtures/workspaces'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { Section } from '../settings/Section'
import { MemberList } from './MemberList'
import styles from './Members.module.css'

/** The invite of an owner, by GitHub login. */
function InviteSection() {
  const { field } = useControlSizes()
  return (
    <Section
      description="Invite a person by their GitHub login. They join when they accept."
      title="Invite a member"
    >
      <div className={styles.invite}>
        <InputFrame
          accessibilityLabel="GitHub login"
          onChangeText={noop}
          placeholder="GitHub login"
          prefixIcon={AtSign}
          size={field}
          value=""
        />
        <ActionButton icon={UserPlus}>Invite</ActionButton>
      </div>
    </Section>
  )
}

/**
 * The members of an org: an invite by GitHub login, then each member with
 * their role. Owners manage the members and who owns each workspace. A
 * member who is not an owner sees the members and their roles, without
 * the invite and without actions.
 */
export function MembersTab(props: { viewer: PersonKey; canManage: boolean }) {
  return (
    <>
      {props.canManage ? <InviteSection /> : null}
      <Section
        description="Owners manage the members and who owns each workspace. Members work in the workspaces."
        title="Members"
      >
        <MemberList
          canManage={props.canManage}
          invites={props.canManage ? acmeInvites : []}
          members={acmeMembers}
          viewer={props.viewer}
          workspaces={workspaceList}
        />
      </Section>
    </>
  )
}
