import type { Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { termsAgreement } from '../../../../src/marketing/legal-text'
import { classes } from '../components/common/classes'
import { GitHubMark } from '../components/common/GitHubMark'
import { ScreenLink } from '../components/common/ScreenLink'
import { CatalogueText } from '../components/marketing/CatalogueText'
import { SitePage } from '../components/marketing/SitePage'
import { TextPage } from '../components/marketing/TextPage'
import { noop } from '../noop'
import { paths } from '../paths'
import { signInCopy } from './signInCopy'
import styles from './TermsConsentScreen.module.css'

/**
 * The page before GitHub when a sign-in starts without the agreement to
 * the current terms, such as from the menu of the Mac app. It has the words
 * of the sign-in screen, and the agreement beside Continue with GitHub. The
 * page runs no script, so it has the look of the pages of the site.
 */
export function TermsConsentScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  return (
    <SitePage bare viewport={viewport}>
      <TextPage
        lead={signInCopy.text}
        title={signInCopy.title}
        viewport={viewport}
      >
        <div className={classes(styles.consent, mobile && styles.mobile)}>
          <p className={styles.agreement}>
            <CatalogueText text={termsAgreement} />
          </p>
          <div className={styles.actions}>
            <ScreenLink asChild to={paths.getStarted}>
              <Button
                block={mobile}
                iconNode={<GitHubMark className={styles.mark} size={16} />}
                onPress={noop}
                size="lg"
                tone="primary"
              >
                {signInCopy.action}
              </Button>
            </ScreenLink>
          </div>
        </div>
      </TextPage>
    </SitePage>
  )
}
