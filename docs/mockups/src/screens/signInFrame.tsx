import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { classes } from '../components/common/classes'
import { ScreenLink } from '../components/common/ScreenLink'
import { MobileFrame } from '../components/layout/AppFrame'
import { LegalLinks } from '../components/marketing/LegalLinks'
import { Wordmark } from '../components/marketing/Wordmark'
import { paths } from '../paths'
import { signInCopy } from './signInCopy'
import forms from './forms.module.css'
import styles from './SignInScreen.module.css'
import frame from './signInFrame.module.css'

/**
 * The page of the app before the app opens: the wordmark, one card in the
 * middle, and the legal links at the foot. The sign-in, the sign-in of a
 * join link, and the waitlist share it. It stands alone, without the rail,
 * because the person has no org and no app access yet. A phone draws the
 * card without its outline.
 */
export function SignInFrame(props: {
  /** The name of the card, for assistive technology. */
  label: string
  viewport: Viewport
  /** A wider card, for a list or a field with its button. */
  wide?: boolean
  children: ReactNode
}) {
  const mobile = props.viewport === 'mobile'
  const page = (
    <div className={classes(styles.page, mobile && styles.mobile)}>
      <header className={styles.header}>
        <Wordmark to={paths.marketing} />
      </header>
      <div className={styles.body}>
        <section
          aria-label={props.label}
          className={classes(styles.card, props.wide && frame.wide)}
        >
          {props.children}
        </section>
      </div>
      <footer className={styles.footer}>
        <ScreenLink className={styles.back} to={paths.marketing}>
          {signInCopy.home}
        </ScreenLink>
        <LegalLinks align="center" />
      </footer>
    </div>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={forms.standalone}>{page}</div>
}
