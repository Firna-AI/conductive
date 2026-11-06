import { Button } from '@firna/ui/button'
import appIcon from '../../../docs/brand/conducting-icon.svg'
import { productDomain, productName } from '../../../docs/mockups/src/brand'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { GitHubMark } from '../../../docs/mockups/src/components/common/GitHubMark'
import legal from '../../../docs/mockups/src/components/marketing/LegalLinks.module.css'
import wordmark from '../../../docs/mockups/src/components/marketing/Wordmark.module.css'
import styles from '../../../docs/mockups/src/screens/SignInScreen.module.css'
import { API_PATHS } from '../../shared/api'
import { useServices } from '../../app/services'
import { useViewport } from '../ui/viewport'

/**
 * The legal pages of the site, from decision 35. The marketing site at the
 * root of the product domain serves them.
 */
const legalPages = [
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
] as const

function LegalLinks() {
  return (
    <nav aria-label="Legal" className={`${legal.row} ${legal.center}`}>
      {legalPages.map((page) => (
        <a
          className={legal.link}
          href={`https://${productDomain}${page.path}`}
          key={page.path}
        >
          {page.label}
        </a>
      ))}
    </nav>
  )
}

/**
 * The GitHub sign-in of the app. GitHub is the only way in, and the first
 * sign-in of a new user also creates the account. It stands alone, without
 * the rail, because nobody is signed in yet.
 */
export function SignInScreen() {
  const { leave } = useServices()
  const phone = useViewport() === 'phone'
  const title = `Sign in to ${productName}`
  return (
    <div className={classes(styles.page, phone && styles.mobile)}>
      <header className={styles.header}>
        <a className={wordmark.wordmark} href={`https://${productDomain}`}>
          <img alt="" height={28} src={appIcon} width={28} />
          <span className={wordmark.name}>{productName}</span>
        </a>
      </header>
      <div className={styles.body}>
        <section aria-label={title} className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.text}>
            Use your GitHub account. If you are new, this also creates your
            account.
          </p>
          <Button
            block
            iconNode={<GitHubMark className={styles.mark} size={17} />}
            onPress={() => leave(API_PATHS.githubSignIn)}
            size="lg"
            tone="primary"
          >
            Continue with GitHub
          </Button>
        </section>
      </div>
      <footer className={styles.footer}>
        <a className={styles.back} href={`https://${productDomain}`}>
          Back to the home page
        </a>
        <LegalLinks />
      </footer>
    </div>
  )
}
