import type { ReactNode } from 'react'
import { productDomain } from '../../../docs/mockups/src/brand'
import { Lockup } from '../../../docs/mockups/src/components/brand/Logo'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import legal from '../../../docs/mockups/src/components/marketing/LegalLinks.module.css'
import wordmark from '../../../docs/mockups/src/components/marketing/Wordmark.module.css'
import { signInCopy } from '../../../docs/mockups/src/screens/signInCopy'
import styles from '../../../docs/mockups/src/screens/SignInScreen.module.css'
import frame from '../../../docs/mockups/src/screens/signInFrame.module.css'
import { pageHrefs } from '../../marketing/links'
import { useMacWindow } from '../mac/mac-app'
import mac from '../mac/mac.module.css'
import { useViewport } from '../ui/viewport'
import own from './SignInFrame.module.css'

/**
 * The pages of the marketing site at the root of the product domain, which
 * serves the legal pages.
 */
export const siteHrefs = pageHrefs(`https://${productDomain}`)

const legalPages = [
  { label: 'Terms', page: 'terms' },
  { label: 'Privacy', page: 'privacy' },
] as const

function LegalLinks() {
  return (
    <nav aria-label="Legal" className={`${legal.row} ${legal.center}`}>
      {legalPages.map((page) => (
        <a className={legal.link} href={siteHrefs[page.page]} key={page.page}>
          {page.label}
        </a>
      ))}
    </nav>
  )
}

/** The height of the lockup in the top bar of the Mac app, in px. */
const macLockup = 22

/**
 * The header of the page, with the lockup that leads to the home page. With
 * `windowBar`, the header is the top bar of the Mac app on desktop: as high
 * as the top bars of the app, it moves the window, and in a window it keeps
 * the space of the window buttons free. In full screen it gives that space
 * back. A browser, and a phone, draw the usual header.
 */
function Header(props: { windowBar: boolean }) {
  const mode = useMacWindow()?.mode
  const phone = useViewport() === 'phone'
  const bar = props.windowBar && mode !== undefined && !phone
  return (
    <header
      className={classes(
        styles.header,
        bar && frame.macBar,
        bar && mac.drag,
        bar && mode === 'window' && frame.windowButtons,
      )}
    >
      <a className={wordmark.wordmark} href={siteHrefs.home}>
        <Lockup height={bar ? macLockup : 30} />
      </a>
    </header>
  )
}

/**
 * The page of the app before the app opens: the lockup, one card in the
 * middle, and the legal links at the foot. The sign-in, the sign-in of a
 * join link, and the waitlist share it. It stands alone, without the rail,
 * because the person has no org and no app access yet. A phone draws the
 * card without its outline. The page scrolls when it is taller than the
 * window.
 */
export function SignInFrame(props: {
  /** The name of the card, for assistive technology. */
  label: string
  /** A wider card, for a list or a field with its button. */
  wide?: boolean
  /**
   * The page has no top bar of its own, so in the Mac app its header is the
   * top bar of the window, as on the waitlist.
   */
  windowBar?: boolean
  children: ReactNode
}) {
  const phone = useViewport() === 'phone'
  return (
    <div className={classes(styles.page, phone && styles.mobile, own.scroll)}>
      <Header windowBar={props.windowBar ?? false} />
      <div className={styles.body}>
        <section
          aria-label={props.label}
          className={classes(styles.card, props.wide && frame.wide)}
        >
          {props.children}
        </section>
      </div>
      <footer className={styles.footer}>
        <a className={styles.back} href={siteHrefs.home}>
          {signInCopy.home}
        </a>
        <LegalLinks />
      </footer>
    </div>
  )
}
