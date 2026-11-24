import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { classes } from '../../../../src/ui/components/common/classes'
import { ScreenLink } from '../components/common/ScreenLink'
import { mobileFrame } from '../entries/components/layout/AppFrame.mockup'
import { useMacApp } from '../../../../src/ui/components/mac/MacApp'
import { LegalLinks, type LegalPages } from '../components/marketing/LegalLinks'
import { Wordmark } from '../components/marketing/Wordmark'
import { paths } from '../paths'
import { signInCopy } from '../../../../src/ui/screens/signInCopy'
import forms from '../../../../src/ui/screens/forms.module.css'
import styles from '../../../../src/ui/screens/SignInScreen.module.css'
import frame from '../../../../src/ui/screens/signInFrame.module.css'

/** The height of the lockup in the top bar of the Mac app, in px. */
const macLockup = 22

/**
 * The header of the page. In the Mac app the window has no title bar, so
 * the header is the top bar of the window. It is as high as the top bars
 * of the app, it moves the window, and in a window it keeps the space of
 * the window buttons free. In full screen it gives that space back. The
 * wordmark leads to the home page of the site, except in a phone app.
 */
function Header(props: { phoneApp: boolean }) {
  const mac = useMacApp()
  return (
    <header
      className={classes(
        styles.header,
        mac && frame.macBar,
        mac?.mode === 'window' && frame.windowButtons,
      )}
    >
      <Wordmark
        height={mac ? macLockup : undefined}
        place="sign-in"
        to={props.phoneApp ? undefined : paths.marketing}
      />
    </header>
  )
}

/**
 * The foot of the page: the way back to the home page of the site, and
 * the legal links. A phone app keeps only the legal links. `legal` gives
 * the pages that they open.
 */
function Foot(props: { phoneApp: boolean; legal: LegalPages | undefined }) {
  return (
    <footer className={styles.footer}>
      {props.phoneApp ? null : (
        <ScreenLink className={styles.back} to={paths.marketing}>
          {signInCopy.home}
        </ScreenLink>
      )}
      <LegalLinks align="center" pages={props.legal} />
    </footer>
  )
}

/**
 * The page of the app before the app opens: the wordmark, one card in the
 * middle, and the legal links at the foot. The sign-in, the sign-in of a
 * join link, and the waitlist share it. It stands alone, without the rail,
 * because the person has no org and no app access yet. A phone draws the
 * card without its outline. A phone app passes the legal pages of the app
 * host as `legal`, so its page links to no page of the site. The pages
 * that stop a phone app, such as Update the app, have no foot.
 */
export function SignInFrame(props: {
  /** The name of the card, for assistive technology. */
  label: string
  viewport: Viewport
  /** A wider card, for a list or a field with its button. */
  wide?: boolean
  /**
   * The page of a phone app: the wordmark is no link, and the foot has no
   * way back to the home page of the site.
   */
  phoneApp?: boolean
  /** A page without a foot, such as a page that stops a phone app. */
  bare?: boolean
  /**
   * The pages that the legal links of the foot open, such as those of a
   * phone app. Without it, they open the legal pages of the site.
   */
  legal?: LegalPages
  children: ReactNode
}) {
  const mobile = props.viewport === 'mobile'
  const phoneApp = props.phoneApp ?? false
  const page = (
    <div className={classes(styles.page, mobile && styles.mobile)}>
      <Header phoneApp={phoneApp} />
      <div className={styles.body}>
        <section
          aria-label={props.label}
          className={classes(styles.card, props.wide && frame.wide)}
        >
          {props.children}
        </section>
      </div>
      {props.bare ? null : <Foot legal={props.legal} phoneApp={phoneApp} />}
    </div>
  )
  if (mobile) return <mobileFrame.Component>{page}</mobileFrame.Component>
  return <div className={forms.standalone}>{page}</div>
}
