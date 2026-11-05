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
 * because the main action follows at once in the hero.
 */
export function SiteHeader(props: { links: SiteLinks; viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  return (
    <header className={classes(styles.header, mobile && styles.mobile)}>
      <div className={styles.inner}>
        <Wordmark to={props.links.home} />
        <nav aria-label="Site" className={styles.nav}>
          {mobile ? null : (
            <>
              <a className={styles.link} href="#features">
                Features
              </a>
            </>
          )}
          <ScreenLink className={styles.link} to={props.links.signIn}>
            Sign in
          </ScreenLink>
          {mobile ? null : <StartButton size="md" to={props.links.signIn} />}
        </nav>
      </div>
    </header>
  )
}
