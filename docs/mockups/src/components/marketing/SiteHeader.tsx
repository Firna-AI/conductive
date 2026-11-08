import type { Viewport } from '@mokly/mokly'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { StartButton } from './SiteActions'
import { Wordmark } from './Wordmark'
import styles from './SiteHeader.module.css'

/** Where the header leads: the home page, and the GitHub sign-in. */
export type SiteLinks = { home: string; signIn: string }

/**
 * The top of the site: the wordmark, links to the sections of the page,
 * Sign in, and the main action. A phone keeps the wordmark and Sign in,
 * because the main action follows at once in the hero. A bare header has
 * only the wordmark, for a page that leads on to sign-in itself.
 */
export function SiteHeader(props: {
  links: SiteLinks
  viewport: Viewport
  bare?: boolean
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <header className={classes(styles.header, mobile && styles.mobile)}>
      <div className={styles.inner}>
        <Wordmark to={props.links.home} />
        {props.bare ? null : <SiteNav links={props.links} mobile={mobile} />}
      </div>
    </header>
  )
}

/** The links of the header: the features, Sign in, and the main action. */
function SiteNav(props: { links: SiteLinks; mobile: boolean }) {
  const { mobile } = props
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
        </>
      )}
      <ScreenLink className={styles.link} to={props.links.signIn}>
        Sign in
      </ScreenLink>
      {mobile ? null : <StartButton size="md" to={props.links.signIn} />}
    </nav>
  )
}
