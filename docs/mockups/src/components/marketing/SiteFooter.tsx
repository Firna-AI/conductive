import type { ReactNode } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { siteActionCopy } from '../../../../../src/marketing/access-copy'
import { abuseAddress } from '../../../../../src/marketing/legal-text'
import { pricingLinkText } from '../../../../../src/marketing/pricing'
import { productName } from '../../../../../src/shared/brand'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../../../../../src/ui/components/common/classes'
import { MailLink } from './CatalogueText'
import { LegalLinks } from './LegalLinks'
import type { SiteLinks } from './SiteHeader'
import { Wordmark } from './Wordmark'
import styles from './SiteFooter.module.css'

function Column(props: { title: string; children: ReactNode }) {
  return (
    <div className={styles.column}>
      <h2 className={styles.heading}>{props.title}</h2>
      <ul className={styles.links}>{props.children}</ul>
    </div>
  )
}

/**
 * The foot of the site: the wordmark, the sections with the features, the
 * pricing page, and the docs, the sign-in, the address for abuse reports,
 * and the legal pages beside the copyright.
 */
export function SiteFooter(props: {
  links: SiteLinks
  tagline: string
  year: number
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <footer className={classes(styles.footer, mobile && styles.mobile)}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Wordmark place="footer" to={props.links.home} />
          <p className={styles.tagline}>{props.tagline}</p>
        </div>
        <Column title="Product">
          <li>
            <ScreenLink
              className={styles.link}
              fragment="features"
              to={props.links.home}
            >
              Features
            </ScreenLink>
          </li>
          <li>
            <ScreenLink className={styles.link} to={props.links.pricing}>
              {pricingLinkText}
            </ScreenLink>
          </li>
          <li>
            <ScreenLink className={styles.link} to={props.links.docs}>
              Docs
            </ScreenLink>
          </li>
          <li>
            <ScreenLink
              className={styles.link}
              fragment="mac-app"
              to={props.links.home}
            >
              Mac app
            </ScreenLink>
          </li>
        </Column>
        <Column title="Account">
          <li>
            <ScreenLink className={styles.link} to={props.links.signIn}>
              {siteActionCopy.signUp}
            </ScreenLink>
          </li>
          <li>
            <ScreenLink className={styles.link} to={props.links.signIn}>
              Sign in
            </ScreenLink>
          </li>
        </Column>
        <Column title="Report abuse">
          <li>
            <MailLink address={abuseAddress} className={styles.link}>
              {abuseAddress}
            </MailLink>
          </li>
        </Column>
      </div>
      <div className={classes(styles.inner, styles.bottom)}>
        <p className={styles.legal}>
          © {props.year} {productName}
        </p>
        <LegalLinks />
      </div>
    </footer>
  )
}
