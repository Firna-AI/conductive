import type { Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { Ticket } from 'lucide-react'
import { termsAgreement } from '../../../../src/marketing/legal-text'
import { GitHubMark } from '../components/common/GitHubMark'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { CatalogueText } from '../components/marketing/CatalogueText'
import { noop } from '../noop'
import { paths } from '../paths'
import { SignInFrame } from './signInFrame'
import { signInCopy } from './signInCopy'
import { waitlistCopy } from './waitlistCopy'
import frame from './signInFrame.module.css'
import styles from './SignInScreen.module.css'

/**
 * The invite code that a join link carries. The page names no owner of
 * the code, because a shared code can travel far.
 */
function LinkCode(props: { code: string }) {
  return (
    <Notice
      body={<span className={frame.inviteCode}>{props.code}</span>}
      icon={Ticket}
      title={waitlistCopy.linkCode}
    />
  )
}

/**
 * The GitHub sign-in of the app. GitHub is the only way in, and the first
 * sign-in of a new person also creates the account, which waits on the
 * waitlist. A join link opens the same page with its invite code above the
 * agreement, and after GitHub the code lets the person in. The agreement
 * to the terms sits just above Continue with GitHub.
 */
export function SignInScreen(props: { viewport: Viewport; code?: string }) {
  return (
    <SignInFrame label={signInCopy.title} viewport={props.viewport}>
      <h1 className={styles.title}>{signInCopy.title}</h1>
      <p className={styles.text}>{signInCopy.text}</p>
      {props.code ? <LinkCode code={props.code} /> : null}
      <p className={styles.agreement}>
        <CatalogueText text={termsAgreement} />
      </p>
      <ScreenLink asChild to={props.code ? paths.getStarted : paths.waitlist}>
        <Button
          block
          iconNode={<GitHubMark className={styles.mark} size={17} />}
          onPress={noop}
          size="lg"
          tone="primary"
        >
          {signInCopy.action}
        </Button>
      </ScreenLink>
    </SignInFrame>
  )
}
