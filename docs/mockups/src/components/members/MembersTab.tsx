import { InputFrame } from '@firna/ui/input'
import { AtSign, Sparkles, UserPlus } from 'lucide-react'
import { acmeTeam } from '../../fixtures/billing'
import { firnaWorkspaces } from '../../fixtures/freeOrg'
import {
  acmeInvites,
  acmeMembers,
  firnaMembers,
  refusedInvite,
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

/** On Team, each member and each open invite takes a seat. */
function SeatsLine() {
  const used = acmeMembers.length + acmeInvites.length
  return (
    <p className={styles.seatsLine}>
      {acmeTeam.seats - used} of {acmeTeam.seats} seats free.
      <ScreenLink className={styles.seatsLink} to={paths.billing}>
        Change seats
      </ScreenLink>
    </p>
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

/**
 * The members of an org: an invite by GitHub login, then each member with
 * their role. Owners manage the members, the billing, and the owners of
 * workspaces.
 */
export function MembersTab(props: { view: MembersView }) {
  const free = props.view === 'free'
  return (
    <>
      <Section
        description="Invite a person by their GitHub login. They join when they accept."
        title="Invite a member"
      >
        <LoginField value={free ? refusedInvite : ''} />
        {free ? <UpgradeNotice /> : <SeatsLine />}
      </Section>
      <Section
        description="Owners manage the members, the billing, and who owns each workspace. Members work in the workspaces."
        title="Members"
      >
        <MemberList
          invites={free ? [] : acmeInvites}
          members={free ? firnaMembers : acmeMembers}
          workspaces={free ? firnaWorkspaces : workspaceList}
        />
      </Section>
    </>
  )
}
