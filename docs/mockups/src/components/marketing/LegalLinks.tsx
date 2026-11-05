import { classes } from '../common/classes'
import styles from './LegalLinks.module.css'

/**
 * The pages that the site needs before it sells plans, from decision 35,
 * drawn as its recommended option D. The pages are not drawn yet, so each
 * link is a placeholder without an address.
 */
export const legalPages = [
  'Terms',
  'Privacy',
  'Refunds and cancellation',
  'Contact',
] as const

export type LegalPage = (typeof legalPages)[number]

/** A link to one legal page, inside text such as a consent line. */
export function LegalLink(props: { page: LegalPage }) {
  return <a className={styles.inline}>{props.page}</a>
}

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
