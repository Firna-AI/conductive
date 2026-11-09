import { Plug } from 'lucide-react'
import styles from './SessionLogin.module.css'

/**
 * Whose agent login a session uses: the login of its starter. The starter
 * is the viewer, or another member, with the name that the app shows for
 * that member.
 */
type LoginOwner = { kind: 'viewer' } | { kind: 'member'; name: string }

export type SessionLogin = {
  owner: LoginOwner
  /** The name of the agent of the login, such as "Claude". */
  agent: string
}

/**
 * The line under the composer box that names whose agent login the
 * session uses, such as "Uses Cal's Claude login", so that each member
 * sees whose login a message spends. It shows in every composer of a
 * session, also for the own login of the viewer.
 */
export function SessionLoginLine(props: SessionLogin) {
  const { owner } = props
  const whose = owner.kind === 'viewer' ? 'your' : `${owner.name}'s`
  const words = `Uses ${whose} ${props.agent} login`
  return (
    <p className={styles.line}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span className={styles.text}>{words}</span>
    </p>
  )
}
