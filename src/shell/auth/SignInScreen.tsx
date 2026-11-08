import { Button } from '@firna/ui/button'
import { productDomain } from '../../../docs/mockups/src/brand'
import { Lockup } from '../../../docs/mockups/src/components/brand/Logo'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { GitHubMark } from '../../../docs/mockups/src/components/common/GitHubMark'
import legal from '../../../docs/mockups/src/components/marketing/LegalLinks.module.css'
import {
  RunningText,
  type TextLinkRenderer,
} from '../../../docs/mockups/src/components/marketing/RunningText'
import wordmark from '../../../docs/mockups/src/components/marketing/Wordmark.module.css'
import { signInCopy } from '../../../docs/mockups/src/screens/signInCopy'
import styles from '../../../docs/mockups/src/screens/SignInScreen.module.css'
import { termsAgreement } from '../../marketing/legal-text'
import { pageHrefs } from '../../marketing/links'
import { acceptedTermsSignInPath } from '../../shared/terms'
import { useServices } from '../../app/services'
import { useViewport } from '../ui/viewport'

/**
 * The pages of the marketing site at the root of the product domain, which
 * serves the legal pages of decision 35.
 */
const siteHrefs = pageHrefs(`https://${productDomain}`)

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
 * sign-in of a new user also creates the account. The agreement to the
 * terms sits just above Continue with GitHub, which carries the current
 * terms revision. It stands alone, without the rail, because nobody is
 * signed in yet.
 */
export function SignInScreen() {
  const { leave } = useServices()
  const phone = useViewport() === 'phone'
  return (
    <div className={classes(styles.page, phone && styles.mobile)}>
      <header className={styles.header}>
        <a className={wordmark.wordmark} href={siteHrefs.home}>
          <Lockup height={30} />
        </a>
      </header>
      <div className={styles.body}>
        <section aria-label={signInCopy.title} className={styles.card}>
          <h1 className={styles.title}>{signInCopy.title}</h1>
          <p className={styles.text}>{signInCopy.text}</p>
          <p className={styles.agreement}>
            <RunningText link={siteLink} text={termsAgreement} />
          </p>
          <Button
            block
            iconNode={<GitHubMark className={styles.mark} size={17} />}
            onPress={() => leave(acceptedTermsSignInPath())}
            size="lg"
            tone="primary"
          >
            {signInCopy.action}
          </Button>
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
