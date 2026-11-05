import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { productName } from '../brand'
import { classes } from '../components/common/classes'
import { ExternalLink } from '../components/common/ExternalLink'
import { GitHubMark } from '../components/common/GitHubMark'
import { ScreenLink } from '../components/common/ScreenLink'
import { MobileFrame } from '../components/layout/AppFrame'
import { LegalLinks } from '../components/marketing/LegalLinks'
import { Wordmark } from '../components/marketing/Wordmark'
import {
  githubEmailSettings,
  minimumAccountAge,
  refusedAccount,
} from '../fixtures/signUp'
import { noop } from '../noop'
import { paths } from '../paths'
import forms from './forms.module.css'
import styles from './SignInScreen.module.css'

export const signInSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['refusal'],
  properties: {
    /**
     * Why GitHub's account cannot sign up yet: it is too new, or it has
     * no verified email. A sign-in that works has none.
     */
    refusal: { enum: ['none', 'too-new', 'unverified'] },
  },
} as const

export type SignInState = SchemaProps<typeof signInSchema>

function ContinueButton() {
  return (
    <ScreenLink asChild to={paths.getStarted}>
      <Button
        block
        iconNode={<GitHubMark className={styles.mark} size={17} />}
        onPress={noop}
        size="lg"
        tone="primary"
      >
        Continue with GitHub
      </Button>
    </ScreenLink>
  )
}

/** The card of each state: its title, its text, and its action. */
function cardFor(refusal: SignInState['refusal']): {
  title: string
  body: ReactNode
  action?: ReactNode
} {
  switch (refusal) {
    case 'none':
      return {
        title: `Sign in to ${productName}`,
        body: 'Use your GitHub account. If you are new, this also creates your account.',
        action: <ContinueButton />,
      }
    case 'too-new':
      return {
        title: `You can sign up on ${refusedAccount.canSignUp}`,
        body: `${productName} needs a GitHub account that is at least ${minimumAccountAge} days old, and @${refusedAccount.login} was created on ${refusedAccount.created}.`,
      }
    case 'unverified':
      return {
        title: 'Verify your email on GitHub',
        body: (
          <>
            {productName} needs a GitHub account with a verified email. Verify
            it on GitHub, then continue.{' '}
            <ExternalLink href={githubEmailSettings}>
              Open your email settings
            </ExternalLink>
          </>
        ),
        action: <ContinueButton />,
      }
  }
}

/**
 * The GitHub sign-in of the app. GitHub is the only way in, and the first
 * sign-in of a new user also creates the account. A new account that
 * cannot sign up yet sees the reason and the fix. The page stands alone,
 * without the rail, because nobody is signed in yet.
 */
export function SignInScreen(props: {
  state: SignInState
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  const card = cardFor(props.state.refusal)
  const page = (
    <div className={classes(styles.page, mobile && styles.mobile)}>
      <header className={styles.header}>
        <Wordmark to={paths.marketing} />
      </header>
      <div className={styles.body}>
        <section aria-label={card.title} className={styles.card}>
          <h1 className={styles.title}>{card.title}</h1>
          <p className={styles.text}>{card.body}</p>
          {card.action}
        </section>
      </div>
      <footer className={styles.footer}>
        <ScreenLink className={styles.back} to={paths.marketing}>
          Back to the home page
        </ScreenLink>
        <LegalLinks align="center" />
      </footer>
    </div>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={forms.standalone}>{page}</div>
}
