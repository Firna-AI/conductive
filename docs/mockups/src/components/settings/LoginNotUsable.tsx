import type { AgentKey } from '../../fixtures/agents'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { chatGptSignInCopy as copy } from '../../../../../src/ui/components/settings/chatGptSignInCopy'
import styles from '../../../../../src/ui/components/settings/LoginNotUsable.module.css'

/**
 * A connected login that the app can no longer use, such as a ChatGPT
 * sign-in that OpenAI did not renew: its agent, the cause from the field
 * `unusableCause` of the login status, and where Sign in again leads.
 */
export type UnusableLogin = { agent: AgentKey; cause: string; signInTo: string }

/** The state of the login in its row, in place of Connected. */
export function SignedOutStatus() {
  return (
    <statusText.Component
      icon="circle-alert"
      label={copy.signedOut}
      moklyInstance="signed-out"
      tone="danger"
    />
  )
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
        <actionButton.Component moklyInstance="sign-in-again" tone="primary">
          {copy.signInAgain}
        </actionButton.Component>
      </ScreenLink>
    </div>
  )
}
