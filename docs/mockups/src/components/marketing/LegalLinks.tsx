import { paths } from '../../paths'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import styles from './LegalLinks.module.css'

/** The legal pages of the site, as the user chose for decision 35. */
const legalPages = [
  { label: 'Terms', to: paths.terms },
  { label: 'Privacy', to: paths.privacy },
] as const

/** The legal pages in a row, which wraps on a narrow screen. */
export function LegalLinks(props: { align?: 'start' | 'center' }) {
  return (
    <nav
      aria-label="Legal"
      className={classes(styles.row, props.align === 'center' && styles.center)}
    >
      {legalPages.map((page) => (
        <ScreenLink className={styles.link} key={page.to} to={page.to}>
          {page.label}
        </ScreenLink>
      ))}
    </nav>
  )
}
