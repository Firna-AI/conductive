import { Mail } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/members/Members.module.css'
import { personName } from '../../app/people'
import type { OrgRole, User } from '../../shared/api'
import type {
  MembersResponse,
  OrgInvite,
  OrgMember,
} from '../../shared/members'
import type { Workspace } from '../../shared/workspaces'
import { PersonAvatar } from '../ui/Avatars'
import { inSentence, useWhen } from './when'

const roleLabels: Readonly<Record<OrgRole, string>> = {
  admin: 'Admin',
  member: 'Member',
}

/** How many workspaces of the org a member owns. */
function owned(member: OrgMember, workspaces: readonly Workspace[]): string {
  const total = workspaces.filter(
    (workspace) => workspace.owner.id === member.user.id,
  ).length
  return `${total} ${total === 1 ? 'workspace' : 'workspaces'}`
}

/**
 * A member: the avatar, the name, the GitHub login, the workspaces that
 * the member owns, and the role. While the workspaces load, the count
 * waits.
 */
function MemberRow(props: {
  member: OrgMember
  you: boolean
  workspaces: readonly Workspace[] | undefined
}) {
  const { user } = props.member
  const login = `@${user.githubLogin}`
  return (
    <li className={styles.row}>
      <PersonAvatar person={user} size={28} />
      <span className={styles.text}>
        <span className={styles.name}>
          {personName(user)}
          {props.you ? <span className={styles.you}> (you)</span> : null}
        </span>
        <span className={styles.detail}>
          {props.workspaces
            ? `${login} · ${owned(props.member, props.workspaces)}`
            : login}
        </span>
      </span>
      <span className={styles.role}>{roleLabels[props.member.role]}</span>
    </li>
  )
}

/** An open invite: the GitHub login, and when the invite went out. */
function InviteRow(props: { invite: OrgInvite; when: string }) {
  return (
    <li className={styles.row}>
      <span aria-hidden className={styles.inviteMark}>
        <Mail size={13} />
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{`@${props.invite.githubLogin}`}</span>
        <span className={styles.detail}>{`Invited ${props.when}`}</span>
      </span>
    </li>
  )
}

/**
 * The members of an org with their roles, then the open invites, which
 * only an admin sees. `user` is the person signed in.
 */
export function MemberList(props: {
  members: MembersResponse
  workspaces: readonly Workspace[] | undefined
  user: User
  admin: boolean
}) {
  const { when } = useWhen(60_000)
  return (
    <ul aria-label="Members" className={styles.list}>
      {props.members.members.map((member) => (
        <MemberRow
          key={member.user.id}
          member={member}
          workspaces={props.workspaces}
          you={member.user.id === props.user.id}
        />
      ))}
      {props.admin
        ? props.members.invites.map((invite) => (
            <InviteRow
              invite={invite}
              key={invite.id}
              when={inSentence(when(invite.createdAt))}
            />
          ))
        : null}
    </ul>
  )
}
