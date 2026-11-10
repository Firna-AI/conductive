import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { sourceRepositoryHref } from '../../../../../src/marketing/links'
import { pricingLinkText } from '../../../../../src/marketing/pricing'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { StartButton } from './SiteActions'
import { Wordmark } from './Wordmark'
import styles from './SiteHeader.module.css'

/**
 * Where the header and the footer lead: the home page, the pricing page, the
 * docs, the page for people who move from Conductor Cloud, and the GitHub
 * sign-in.
 */
export type SiteLinks = {
  home: string
  pricing: string
  docs: string
  fromConductor: string
  signIn: string
}

/** The section of the site that a page belongs to, which the header marks. */
export type SiteSection = 'docs' | 'pricing'

/**
 * How the link of the current section tells screen readers where they are.
 * The docs hold many pages, and the pricing page is one page.
 */
const ariaCurrent: Readonly<Record<SiteSection, 'true' | 'page'>> = {
  docs: 'true',
  pricing: 'page',
}

/**
 * The top of the site: the wordmark, Features, Download, Pricing, Docs,
 * GitHub, Sign in, and the main action. Features and Download lead to their
 * sections of the home page. A phone keeps the wordmark, Docs, GitHub as its
 * mark, and Sign in. A bare header has only the wordmark, for a page that
 * leads on to sign-in itself.
 */
export function SiteHeader(props: {
  links: SiteLinks
  viewport: Viewport
  bare?: boolean
  current?: SiteSection
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <header className={classes(styles.header, mobile && styles.mobile)}>
      <div className={styles.inner}>
        <Wordmark to={props.links.home} />
        {props.bare ? null : (
          <SiteNav
            current={props.current}
            links={props.links}
            mobile={mobile}
          />
        )}
      </div>
    </header>
  )
}

/**
 * A link to a section of the site. When the page belongs to that section,
 * the link takes the fill of the current section and tells screen readers.
 */
function SectionLink(props: {
  section: SiteSection
  to: string
  current?: SiteSection
  children: ReactNode
}) {
  const current = props.current === props.section
  return (
    <ScreenLink
      aria-current={current ? ariaCurrent[props.section] : undefined}
      className={classes(styles.link, current && styles.current)}
      to={props.to}
    >
      {props.children}
    </ScreenLink>
  )
}

/**
 * The links of the header: Features, Download, Pricing, Docs, GitHub, Sign
 * in, and the main action. A phone leaves out Features, Download, Pricing,
 * and the main action, and its footer links the pricing page. There GitHub
 * shows only its mark, in a square touch target, so that every link fits
 * beside the wordmark.
 */
function SiteNav(props: {
  links: SiteLinks
  mobile: boolean
  current?: SiteSection
}) {
  const { mobile } = props
  const sourceHref = useOutsideHref(sourceRepositoryHref)
  return (
    <nav aria-label="Site" className={styles.nav}>
      {mobile ? null : (
        <>
          <ScreenLink
            className={styles.link}
            fragment="features"
            to={props.links.home}
          >
            Features
          </ScreenLink>
          <ScreenLink
            className={styles.link}
            fragment="mac-app"
            to={props.links.home}
          >
            Download
          </ScreenLink>
          <SectionLink
            current={props.current}
            section="pricing"
            to={props.links.pricing}
          >
            {pricingLinkText}
          </SectionLink>
        </>
      )}
      <SectionLink current={props.current} section="docs" to={props.links.docs}>
        Docs
      </SectionLink>
      <a
        aria-label={mobile ? 'GitHub' : undefined}
        className={classes(styles.link, mobile && styles.mark)}
        href={sourceHref}
        title="Open source on GitHub"
      >
        <GitHubMark size={mobile ? 18 : 16} />
        {mobile ? null : 'GitHub'}
      </a>
      <ScreenLink className={styles.link} to={props.links.signIn}>
        Sign in
      </ScreenLink>
      {mobile ? null : <StartButton size="md" to={props.links.signIn} />}
    </nav>
  )
}
