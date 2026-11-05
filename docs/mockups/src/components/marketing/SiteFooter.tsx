import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { productName } from '../../brand'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
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

/** The foot of the site: the wordmark, the sections, and the sign-in. */
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
          <Wordmark to={props.links.home} />
          <p className={styles.tagline}>{props.tagline}</p>
        </div>
        <Column title="Product">
          <li>
            <a className={styles.link} href="#features">
              Features
            </a>
          </li>
          <li>
            <a className={styles.link} href="#pricing">
              Pricing
            </a>
          </li>
        </Column>
        <Column title="Account">
          <li>
            <ScreenLink className={styles.link} to={props.links.signIn}>
              Start free with GitHub
            </ScreenLink>
          </li>
          <li>
            <ScreenLink className={styles.link} to={props.links.signIn}>
              Sign in
            </ScreenLink>
          </li>
        </Column>
      </div>
      <div className={styles.inner}>
        <p className={styles.legal}>
          © {props.year} {productName}
        </p>
      </div>
    </footer>
  )
}
