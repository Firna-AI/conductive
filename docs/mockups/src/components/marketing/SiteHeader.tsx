import type { Viewport } from '@mokly/mokly'
import { sourceRepositoryHref } from '../../../../../src/marketing/links'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { StartButton } from './SiteActions'
import { Wordmark } from './Wordmark'
import styles from './SiteHeader.module.css'

/**
 * Where the header and the footer lead: the home page, the docs, the page
 * for people who move from Conductor Cloud, and the GitHub sign-in.
 */
export type SiteLinks = {
  home: string
  docs: string
  fromConductor: string
  signIn: string
}

/** The section of the site that a page belongs to, which the header marks. */
export type SiteSection = 'docs'

/**
 * The top of the site: the wordmark, Features, Download, Docs, GitHub, Sign
 * in, and the main action. Features and Download lead to their sections of
 * the home page. A phone keeps the wordmark, Docs, GitHub as its mark, and
 * Sign in. A bare header has only the wordmark, for a page that leads on to
 * sign-in itself.
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
 * The links of the header: Features, Download, Docs, GitHub, Sign in, and
 * the main action. A phone leaves out Features, Download, and the main
 * action. There GitHub shows only its mark, in a square touch target, so
 * that every link fits beside the wordmark.
 */
function SiteNav(props: {
  links: SiteLinks
  mobile: boolean
  current?: SiteSection
}) {
  const { mobile } = props
  const sourceHref = useOutsideHref(sourceRepositoryHref)
  const inDocs = props.current === 'docs'
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
        </>
      )}
      <ScreenLink
        aria-current={inDocs ? 'true' : undefined}
        className={classes(styles.link, inDocs && styles.current)}
        to={props.links.docs}
      >
        Docs
      </ScreenLink>
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
