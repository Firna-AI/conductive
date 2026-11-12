import { CircleAlert } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/settings/LoginNotUsable.module.css'
import { chatGptSignInCopy as copy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import type { AgentLoginStatus } from '../../shared/account'
import { ActionButton } from '../ui/actions'

/**
 * Why the app can no longer use a connected login, such as a ChatGPT
 * sign-in that OpenAI did not renew, or `null` while it can or while no
 * login is connected.
 */
export function unusableCause(login: AgentLoginStatus | null): string | null {
  if (!login?.connected || login.agent !== 'codex') return null
  return login.unusableCause ?? null
}

/** The state of the login in its row, in place of Connected. */
export function SignedOutStatus() {
  return <StatusText icon={CircleAlert} label={copy.signedOut} tone="danger" />
}

/**
 * The cause under the row of a login that the app can no longer use, then
 * Sign in again, which opens the Connect form of its agent and lines up
 * with Remove. `disabled` turns Sign in again off, as it does Connect.
 */
export function LoginNotUsable(props: {
  cause: string
  signInAgain: () => void
  disabled: boolean
}) {
  return (
    <div className={styles.notUsable}>
      <p className={styles.cause}>{props.cause}</p>
      <ActionButton
        disabled={props.disabled}
        onPress={props.signInAgain}
        tone="primary"
      >
        {copy.signInAgain}
      </ActionButton>
    </div>
  )
}
