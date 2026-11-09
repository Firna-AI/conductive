import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { productSummary } from '../../../../../src/marketing/features'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import { SiteFooter } from './SiteFooter'
import { SiteHeader, type SiteLinks } from './SiteHeader'
import styles from './SitePage.module.css'

const links: SiteLinks = { home: paths.marketing, signIn: paths.signIn }

/** The year of the copyright line. A view reads no clock. */
const year = 2026

/**
 * A page of the marketing site: the header, the content, and the footer.
 * The content grows, so the footer of a short page stays at the bottom. A
 * bare page, such as the page before GitHub on the host of the app, has
 * only the wordmark in its header and no footer.
 */
export function SitePage(props: {
  viewport: Viewport
  children: ReactNode
  bare?: boolean
}) {
  const { viewport, bare } = props
  return (
    <div
      className={classes(styles.site, viewport === 'mobile' && styles.mobile)}
    >
      <SiteHeader bare={bare} links={links} viewport={viewport} />
      <main className={styles.main}>{props.children}</main>
      {bare ? null : (
        <SiteFooter
          links={links}
          tagline={productSummary.tagline}
          viewport={viewport}
          year={year}
        />
      )}
    </div>
  )
}
