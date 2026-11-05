import { classes } from '../common/classes'
import styles from './LegalLinks.module.css'

/**
 * The legal pages of the site, which wait on open decision 35. The pages
 * are not drawn yet, so each link is a placeholder without an address.
 */
export const legalPages = [
  'Terms',
  'Privacy',
  'Refunds and cancellation',
  'Contact',
] as const

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
