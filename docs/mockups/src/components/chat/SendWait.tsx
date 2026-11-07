import styles from './SendWait.module.css'

/**
 * The short reason beside Send while the sandbox of a new workspace starts
 * for the first time. Send waits, and the box keeps the message until the
 * user sends it, also when the sandbox is ready. The words say that the user
 * sends it, so that no one waits for it to send on its own.
 */
export function SendWait() {
  return (
    <span className={styles.reason}>
      You can send when the sandbox is ready
    </span>
  )
}
