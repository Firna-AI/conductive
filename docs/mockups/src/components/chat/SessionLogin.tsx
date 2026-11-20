import { Plug } from 'lucide-react'
import styles from './SessionLogin.module.css'

/**
 * The agent login of a session when it is not the own login of the viewer:
 * the login of another member, its starter, or the org login (decision 1 B
 * of the org logins plan), with the name that the app shows for its owner.
 */
export type SessionLogin = {
  /**
   * The name of the owner of the login: the member, such as "Cal", or the
   * org, such as "Acme".
   */
  owner: string
}

/**
 * The label in the bar of the composer, after the model picker, that names
 * the login of another member, such as "Cal's login", or the org login,
 * such as "Acme's login". So a member sees that a message spends a login
 * that is not their own. The label sits inside the box, so the box keeps
 * its place and its height. A message on the own login of the viewer gets
 * no label.
 */
export function SessionLoginLabel(props: SessionLogin) {
  return (
    <span className={styles.label}>
      <Plug aria-hidden className={styles.icon} size={12} />
      <span className={styles.text}>{`${props.owner}'s login`}</span>
    </span>
  )
}
