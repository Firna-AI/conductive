import { Plug } from 'lucide-react'
import styles from './SessionLogin.module.css'

/**
 * The agent login of another member that a session uses: the login of its
 * starter, with the name that the app shows for that member.
 */
export type SessionLogin = {
  /** The name of the starter, such as "Cal". */
  starter: string
}

/**
 * The label in the bar of the composer, after the model picker, that names
 * the login of another member, such as "Cal's login". So a member sees that
 * a message spends the login of the starter. The label sits inside the box,
 * so the box keeps its place and its height. A message on the own login of
 * the viewer gets no label.
 */
export function SessionLoginLabel(props: SessionLogin) {
  return (
    <span className={styles.label}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span className={styles.text}>{`${props.starter}'s login`}</span>
    </span>
  )
}
