import { Plug } from 'lucide-react'
import styles from './SessionLogin.module.css'

/**
 * The agent login of another member that a session uses: the login of its
 * starter, with the name that the app shows for that member.
 */
export type SessionLogin = {
  /** The name of the starter, such as "Cal". */
  starter: string
  /**
   * The host of the endpoint of an own endpoint login, such as
   * "proxy.example.com". Without it, the login goes to the agent's own
   * provider.
   */
  endpoint?: string
}

/**
 * The label in the bar of the composer, after the model picker, that names
 * the login of another member, such as "Cal's login". So a member sees that
 * a message spends the login of the starter. On an own endpoint it also
 * names the host, such as "Cal's endpoint at proxy.example.com", so that the
 * sender sees where the message goes. The label sits inside the box, so the
 * box keeps its place and its height. A message on the own login of the
 * viewer gets no label.
 */
export function SessionLoginLabel(props: SessionLogin) {
  const words = props.endpoint
    ? `${props.starter}'s endpoint at ${props.endpoint}`
    : `${props.starter}'s login`
  return (
    <span className={styles.label}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span className={styles.text}>{words}</span>
    </span>
  )
}
