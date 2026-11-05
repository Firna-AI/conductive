import { InputFrame } from '@firna/ui/input'
import { AtSign, Sparkles, UserPlus } from 'lucide-react'
import { firnaWorkspaces } from '../../fixtures/freeOrg'
import {
  acmeInvites,
  acmeMembers,
  firnaMembers,
  refusedInvite,
  type PersonKey,
} from '../../fixtures/members'
import { workspaceList } from '../../fixtures/workspaces'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { Section } from '../settings/Section'
import { MemberList } from './MemberList'
import styles from './Members.module.css'

/** What the members tab shows: Acme on Team, or the free org's invite. */
export type MembersView = 'team' | 'free'

function LoginField(props: { value: string }) {
  const { field } = useControlSizes()
  return (
    <div className={styles.invite}>
      <InputFrame
        accessibilityLabel="GitHub login"
        onChangeText={noop}
        placeholder="GitHub login"
        prefixIcon={AtSign}
        size={field}
        value={props.value}
      />
      <ActionButton icon={UserPlus}>Invite</ActionButton>
    </div>
  )
}

/** A free org has one member, so the invite leads to the upgrade. */
function UpgradeNotice() {
  return (
    <Notice
      action={
        <ScreenLink asChild to={paths.upgrade}>
          <ActionButton icon={Sparkles} tone="primary">
            Upgrade
          </ActionButton>
        </ScreenLink>
      }
      body="A Free org has one member."
      icon={UserPlus}
      title="Upgrade to Team to invite members"
    />
  )
}

/** The invite of an owner: a GitHub login, and what an invite costs. */
function InviteSection(props: { free: boolean }) {
  return (
    <Section
      description="Invite a person by their GitHub login. They join when they accept."
      title="Invite a member"
    >
      <LoginField value={props.free ? refusedInvite : ''} />
      {props.free ? (
        <UpgradeNotice />
      ) : (
        <p className={styles.seatsLine}>
          An invite adds a seat when the person accepts it.
        </p>
      )}
    </Section>
  )
}

/**
 * The members of an org: an invite by GitHub login, then each member with
 * their role. Owners manage the members, the billing, and the owners of
 * workspaces. A member who is not an owner sees the members and their
 * roles, without the invite and without actions.
 */
export function MembersTab(props: {
  view: MembersView
  viewer: PersonKey
  canManage: boolean
}) {
  const free = props.view === 'free'
  return (
    <>
      {props.canManage ? <InviteSection free={free} /> : null}
      <Section
        description="Owners manage the members, the billing, and who owns each workspace. Members work in the workspaces."
        title="Members"
      >
        <MemberList
          canManage={props.canManage}
          invites={free || !props.canManage ? [] : acmeInvites}
          members={free ? firnaMembers : acmeMembers}
          viewer={props.viewer}
          workspaces={free ? firnaWorkspaces : workspaceList}
        />
      </Section>
    </>
  )
}
