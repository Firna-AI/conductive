import { LogOut } from 'lucide-react'
import signIn from '../../../docs/mockups/src/screens/SignInScreen.module.css'
import styles from '../../../docs/mockups/src/screens/WaitlistScreen.module.css'
import { waitlistCopy as copy } from '../../../docs/mockups/src/screens/waitlistCopy'
import { useStore } from '../../app/store'
import type { Opener } from '../../app/waitlist-state'
import type { User } from '../../shared/api'
import { SignInFrame } from '../auth/SignInFrame'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { PersonAvatar } from '../ui/Avatars'
import { useAction } from '../ui/useAction'
import { CodeField, CodeNotice } from './CodeField'
import { WaitlistInvitations } from './WaitlistInvitations'

/** The GitHub account of the person, and Sign out, at the foot of the card. */
function AccountRow(props: { user: User }) {
  const app = useApp()
  const signOut = useAction(
    () => app.account.signOut(),
    "You weren't signed out.",
  )
  const { user } = props
  return (
    <div className={styles.account}>
      <PersonAvatar person={user} size={32} />
      <span className={styles.person}>
        <span className={styles.name}>
          {user.displayName ?? `@${user.githubLogin}`}
        </span>
        {user.displayName === null ? null : (
          <span className={styles.login}>@{user.githubLogin}</span>
        )}
      </span>
      <ActionButton busy={signOut.pending} icon={LogOut} onPress={signOut.run}>
        {copy.signOut}
      </ActionButton>
    </div>
  )
}

/**
 * The only screen of a person who is signed in without app access. It says
 * that they wait, and it offers the ways in that the person can take now:
 * an invite code, and the org invitations that wait for them. It names the
 * address that gets the approval email, or, without a verified email,
 * promises no email. It names no place in line and has no Delete account.
 * It names the pause of sign-ups only after the pause stopped a code or an
 * Accept. `open` changes the address when the app opens.
 */
export function WaitlistScreen(props: { user: User; open: Opener }) {
  const state = useStore(useApp().waitlist.state)
  return (
    <SignInFrame label={copy.title} wide windowBar>
      <h1 className={signIn.title}>{copy.title}</h1>
      <p className={signIn.text}>
        {state.approvalEmail === null
          ? copy.noEmail
          : copy.email(state.approvalEmail)}
      </p>
      <WaitlistInvitations open={props.open} state={state} />
      <CodeNotice code={state.code} />
      <CodeField code={state.code} open={props.open} />
      <AccountRow user={props.user} />
    </SignInFrame>
  )
}
