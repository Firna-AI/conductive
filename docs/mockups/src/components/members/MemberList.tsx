import { ChevronDown, Mail, UserMinus, X } from 'lucide-react'
import {
  people,
  removedMember,
  roleLabels,
  type Invite,
  type Membership,
  type Person,
  type PersonKey,
} from '../../fixtures/members'
import type { Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton, IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { PersonAvatar } from '../orgs/OrgTile'
import styles from './Members.module.css'

/** How many workspaces of the org a member owns. */
function owned(
  membership: Membership,
  workspaces: readonly Workspace[],
): string {
  const total = workspaces.filter(
    (item) => item.owner === membership.person,
  ).length
  return `${total} ${total === 1 ? 'workspace' : 'workspaces'}`
}

/**
 * The role of a member, and the actions on it. Only an owner changes a
 * role or removes a member, and nobody removes themselves here.
 */
function RoleActions(props: {
  person: Person
  role: string
  yours: boolean
  canManage: boolean
}) {
  const { person, role } = props
  if (!props.canManage) return <span className={styles.role}>{role}</span>
  if (props.yours) {
    return (
      <>
        <span className={styles.role}>{role}</span>
        <span aria-hidden className={styles.noAction} />
      </>
    )
  }
  const remove = <IconButton icon={UserMinus} label={`Remove ${person.name}`} />
  return (
    <>
      <ActionButton
        accessibilityLabel={`Role of ${person.name}: ${role}`}
        menu
        tone="plain"
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {role}
      </ActionButton>
      {person.key === removedMember ? (
        <ScreenLink asChild to={paths.removeMember}>
          {remove}
        </ScreenLink>
      ) : (
        remove
      )}
    </>
  )
}

function MemberRow(props: {
  membership: Membership
  workspaces: readonly Workspace[]
  viewer: PersonKey
  canManage: boolean
}) {
  const { membership } = props
  const person = people[membership.person]
  const yours = membership.person === props.viewer
  return (
    <li className={styles.row}>
      <PersonAvatar initials={person.initials} size={28} />
      <span className={styles.text}>
        <span className={styles.name}>
          {person.name}
          {yours ? <span className={styles.you}> (you)</span> : null}
        </span>
        <span className={styles.detail}>
          @{person.login} · {owned(membership, props.workspaces)}
        </span>
      </span>
      <RoleActions
        canManage={props.canManage}
        person={person}
        role={roleLabels[membership.role]}
        yours={yours}
      />
    </li>
  )
}

function InviteRow(props: { invite: Invite }) {
  const { invite } = props
  return (
    <li className={styles.row}>
      <span aria-hidden className={styles.inviteMark}>
        <Mail size={13} />
      </span>
      <span className={styles.text}>
        <span className={styles.name}>@{invite.login}</span>
        <span className={styles.detail}>Invited {invite.sent}</span>
      </span>
      <IconButton icon={X} label={`Cancel the invite to @${invite.login}`} />
    </li>
  )
}

/**
 * The members of an org with their roles and the workspaces that each one
 * owns, then the open invites. An owner changes the role of a member and
 * removes a member. `viewer` is the person signed in, and `canManage` says
 * whether that person is an owner.
 */
export function MemberList(props: {
  members: readonly Membership[]
  invites: readonly Invite[]
  workspaces: readonly Workspace[]
  viewer: PersonKey
  canManage: boolean
}) {
  return (
    <ul aria-label="Members" className={styles.list}>
      {props.members.map((membership) => (
        <MemberRow
          canManage={props.canManage}
          key={membership.person}
          membership={membership}
          viewer={props.viewer}
          workspaces={props.workspaces}
        />
      ))}
      {props.invites.map((invite) => (
        <InviteRow invite={invite} key={invite.login} />
      ))}
    </ul>
  )
}
