import { Plug } from 'lucide-react'
import styles from './SessionLogin.module.css'

/**
 * The agent login of another member that a session uses: the login of its
 * starter, with the name that the app shows for that member.
 */
export type SessionLogin = {
  /** The name of the starter, such as "Cal". */
  starter: string
  /** The name of the agent of the login, such as "Claude". */
  agent: string
}

/**
 * The line under the composer box that names the login of another member,
 * such as "Uses Cal's Claude login", so that a member sees that a message
 * spends the login of the starter. A message on the own login of the
 * viewer gets no line.
 */
export function SessionLoginLine(props: SessionLogin) {
  const words = `Uses ${props.starter}'s ${props.agent} login`
  return (
    <p className={styles.line}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span className={styles.text}>{words}</span>
    </p>
  )
}
