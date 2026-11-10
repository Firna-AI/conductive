import { Button } from '@firna/ui/button'
import { Ticket } from 'lucide-react'
import { GitHubMark } from '../../../docs/mockups/src/components/common/GitHubMark'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  RunningText,
  type TextLinkRenderer,
} from '../../../docs/mockups/src/components/marketing/RunningText'
import { signInCopy } from '../../../docs/mockups/src/screens/signInCopy'
import styles from '../../../docs/mockups/src/screens/SignInScreen.module.css'
import frame from '../../../docs/mockups/src/screens/signInFrame.module.css'
import { waitlistCopy } from '../../../docs/mockups/src/screens/waitlistCopy'
import { termsAgreement } from '../../marketing/legal-text'
import { acceptedTermsSignInPath } from '../../shared/terms'
import { useServices } from '../../app/services'
import { SignInFrame, siteHrefs } from './SignInFrame'

/** A link of the agreement, to its page on the marketing site. */
const siteLink: TextLinkRenderer = ({ target, className, children }) => (
  <a
    className={className}
    href={'page' in target ? siteHrefs[target.page] : `mailto:${target.mail}`}
  >
    {children}
  </a>
)

/**
 * The GitHub sign-in of the app. GitHub is the only way in, and the first
 * sign-in of a new person also creates the account, which waits on the
 * waitlist. The agreement to the terms sits just above Continue with
 * GitHub, which carries the current terms revision. A join link opens the
 * same page with its invite `code` above the agreement, and the sign-in
 * carries the code. The page names no owner of the code. It stands alone,
 * without the rail, because nobody is signed in yet.
 */
export function SignInScreen(props: { code?: string }) {
  const { leave } = useServices()
  return (
    <SignInFrame label={signInCopy.title}>
      <h1 className={styles.title}>{signInCopy.title}</h1>
      <p className={styles.text}>{signInCopy.text}</p>
      {props.code === undefined ? null : (
        <Notice
          body={<span className={frame.inviteCode}>{props.code}</span>}
          icon={Ticket}
          title={waitlistCopy.linkCode}
        />
      )}
      <p className={styles.agreement}>
        <RunningText link={siteLink} text={termsAgreement} />
      </p>
      <Button
        block
        iconNode={<GitHubMark className={styles.mark} size={17} />}
        onPress={() => leave(acceptedTermsSignInPath(props.code))}
        size="lg"
        tone="primary"
      >
        {signInCopy.action}
      </Button>
    </SignInFrame>
  )
}
