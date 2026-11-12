import styles from './LoginEndpoint.module.css'

/**
 * The kind of a connected own endpoint login with the host of its endpoint,
 * such as "Own endpoint at proxy.example.com", under the row of the login.
 * The host says where the requests of the agent go. The account never shows
 * the key or the full address. `kind` is the label of the kind.
 */
export function LoginEndpoint(props: { kind: string; host: string }) {
  return (
    <p className={styles.endpoint}>
      {props.kind} at <span className={styles.host}>{props.host}</span>
    </p>
  )
}
