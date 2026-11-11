import { CircleAlert } from 'lucide-react'
import type { AgentKey } from '../../fixtures/agents'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { chatGptSignInCopy as copy } from './chatGptSignInCopy'
import styles from './LoginNotUsable.module.css'

/**
 * A connected login that the app can no longer use, such as a ChatGPT
 * sign-in that OpenAI did not renew: its agent, the cause from the field
 * `unusableCause` of the login status, and where Sign in again leads.
 */
export type UnusableLogin = { agent: AgentKey; cause: string; signInTo: string }

/** The state of the login in its row, in place of Connected. */
export function SignedOutStatus() {
  return <StatusText icon={CircleAlert} label={copy.signedOut} tone="danger" />
}

/**
 * The cause under the row of the login, then Sign in again, which opens
 * the form of its sign-in and lines up with Remove.
 */
export function LoginNotUsable(props: { cause: string; signInTo: string }) {
  return (
    <div className={styles.notUsable}>
      <p className={styles.cause}>{props.cause}</p>
      <ScreenLink asChild to={props.signInTo}>
        <ActionButton tone="primary">{copy.signInAgain}</ActionButton>
      </ScreenLink>
    </div>
  )
}
