import { Mail, UserMinus, X } from 'lucide-react'
import type { OrgRole } from '../shared/api'
import type { OrgInvite, OrgMember } from '../shared/members'
import { pendingKey } from './membersStore'
import { personName, roleLabels, workspaceCount } from './people'
import { RoleMenu } from './RoleMenu'
import { inviteAge } from './time'
import { IconButton } from './ui/actions'
import { PersonAvatar } from './ui/PersonAvatar'
import styles from './Members.module.css'

export type MemberListProps = {
  members: readonly OrgMember[]
  /** The open invites. Only an admin sees them. */
  invites: readonly OrgInvite[]
  /** The number of workspaces that each member owns, by user ID. */
  owned: Readonly<Record<string, number>>
  /** The signed-in person. */
  viewerId: string
  /** The signed-in person is an admin of the org. */
  canManage: boolean
  /** The time now, for the age of each invite. */
  now: number
  /** The changes that run now, as `pendingKey` gives them. */
  pending: readonly string[]
  onChangeRole: (userId: string, role: OrgRole) => void
  onRemove: (member: OrgMember) => void
  onCancelInvite: (invite: OrgInvite) => void
}

/**
 * The role of a member, and the actions on it. Only an admin changes a role
 * or removes a member, and nobody changes or removes themselves here.
 */
function RoleActions(props: MemberListProps & { member: OrgMember }) {
  const { member } = props
  const role = roleLabels[member.role]
  if (!props.canManage) return <span className={styles.role}>{role}</span>
  if (member.user.id === props.viewerId) {
    return (
      <>
        <span className={styles.role}>{role}</span>
        <span aria-hidden className={styles.noAction} />
      </>
    )
  }
  const id = member.user.id
  return (
    <>
      <RoleMenu
        busy={props.pending.includes(pendingKey('role', id))}
        member={member}
        onChange={(next) => props.onChangeRole(id, next)}
      />
      <IconButton
        icon={UserMinus}
        label={`Remove ${personName(member.user)}`}
        onPress={() => props.onRemove(member)}
      />
    </>
  )
}

function MemberRow(props: MemberListProps & { member: OrgMember }) {
  const { user } = props.member
  return (
    <li className={styles.row}>
      <PersonAvatar person={user} size={28} />
      <span className={styles.text}>
        <span className={styles.name}>
          {personName(user)}
          {user.id === props.viewerId ? (
            <span className={styles.you}> (you)</span>
          ) : null}
        </span>
        <span className={styles.detail}>
          @{user.githubLogin} · {workspaceCount(props.owned[user.id] ?? 0)}
        </span>
      </span>
      <RoleActions {...props} />
    </li>
  )
}

function InviteRow(props: {
  invite: OrgInvite
  now: number
  busy: boolean
  onCancel: () => void
}) {
  const { invite } = props
  return (
    <li className={styles.row}>
      <span aria-hidden className={styles.inviteMark}>
        <Mail size={13} />
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{invite.email}</span>
        <span className={styles.detail}>
          Invited {inviteAge(invite.createdAt, props.now)}
        </span>
      </span>
      <IconButton
        busy={props.busy}
        icon={X}
        label={`Cancel the invite to ${invite.email}`}
        onPress={props.onCancel}
      />
    </li>
  )
}

/**
 * The members of an org with their roles and the number of workspaces that
 * each one owns, then the open invites. An admin changes the role of
 * another member, removes another member, and cancels an invite. A member
 * who is not an admin sees the members and their roles only.
 */
export function MemberList(props: MemberListProps) {
  return (
    <ul aria-label="Members" className={styles.list}>
      {props.members.map((member) => (
        <MemberRow key={member.user.id} {...props} member={member} />
      ))}
      {props.canManage
        ? props.invites.map((invite) => (
            <InviteRow
              busy={props.pending.includes(pendingKey('cancel', invite.id))}
              invite={invite}
              key={invite.id}
              now={props.now}
              onCancel={() => props.onCancelInvite(invite)}
            />
          ))
        : null}
    </ul>
  )
}
