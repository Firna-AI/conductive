import type { ReactNode } from 'react'
import { Mail } from 'lucide-react'
import { classes } from '../common/classes'
import members from './Members.module.css'
import styles from './PendingInvites.module.css'

/** One invite that waits for the signed-in person to accept it. */
export type PendingInviteRow = {
  id: string
  /** The name of the org that sent the invite. */
  orgName: string
  /** The verified email of the person's GitHub account that the invite names. */
  email: string
  /** Accept invitation, which joins the org and opens it. */
  accept: ReactNode
}

/**
 * The invites that wait for the signed-in person: each org with the email
 * that it invited, and its own Accept invitation. An invite has no org
 * initials, so the open-invite mark of the Members tab stands in their
 * place. A stacked list puts each Accept invitation under its text, at the
 * full width, as a phone needs.
 */
export function PendingInviteList(props: {
  invites: readonly PendingInviteRow[]
  stacked: boolean
}) {
  return (
    <ul aria-label="Invitations" className={members.list}>
      {props.invites.map((invite) => (
        <li
          className={classes(styles.row, props.stacked && styles.stacked)}
          key={invite.id}
        >
          <span aria-hidden className={members.inviteMark}>
            <Mail size={13} />
          </span>
          <span className={styles.text}>
            <span className={members.name}>{invite.orgName}</span>
            <span className={styles.email}>Sent to {invite.email}</span>
          </span>
          <span className={styles.action}>{invite.accept}</span>
        </li>
      ))}
    </ul>
  )
}
