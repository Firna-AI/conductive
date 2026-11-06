import type { Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { productName } from '../brand'
import { classes } from '../components/common/classes'
import { GitHubMark } from '../components/common/GitHubMark'
import { ScreenLink } from '../components/common/ScreenLink'
import { MobileFrame } from '../components/layout/AppFrame'
import { LegalLinks } from '../components/marketing/LegalLinks'
import { Wordmark } from '../components/marketing/Wordmark'
import { noop } from '../noop'
import { paths } from '../paths'
import forms from './forms.module.css'
import styles from './SignInScreen.module.css'

/**
 * The GitHub sign-in of the app. GitHub is the only way in, and the first
 * sign-in of a new user also creates the account. It stands alone, without
 * the rail, because nobody is signed in yet.
 */
export function SignInScreen(props: { viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  const title = `Sign in to ${productName}`
  const page = (
    <div className={classes(styles.page, mobile && styles.mobile)}>
      <header className={styles.header}>
        <Wordmark to={paths.marketing} />
      </header>
      <div className={styles.body}>
        <section aria-label={title} className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.text}>
            Use your GitHub account. If you are new, this also creates your
            account.
          </p>
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
