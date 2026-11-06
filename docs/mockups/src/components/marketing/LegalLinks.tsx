import { classes } from '../common/classes'
import styles from './LegalLinks.module.css'

/**
 * The legal pages of the site: Terms and Privacy, as the user chose for
 * decision 35. The pages are not drawn yet, so each link is a placeholder
 * without an address.
 */
export const legalPages = ['Terms', 'Privacy'] as const

/** The legal pages in a row, which wraps on a narrow screen. */
export function LegalLinks(props: { align?: 'start' | 'center' }) {
  return (
    <nav
      aria-label="Legal"
      className={classes(styles.row, props.align === 'center' && styles.center)}
    >
      {legalPages.map((page) => (
        <a className={styles.link} key={page}>
          {page}
        </a>
      ))}
    </nav>
  )
}
