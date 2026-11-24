import { paths } from '../../paths'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import styles from '../../../../../src/ui/components/marketing/LegalLinks.module.css'

/** The catalogue page that each legal link opens. */
export type LegalPages = {
  readonly terms: string
  readonly privacy: string
}

/**
 * Where the legal links lead: the catalogue page of each legal page, or
 * `still`, which keeps their look and opens nothing, as `StillLinks` does.
 * A screen uses `still` where no drawn page leads back to it.
 */
export type LegalTargets = LegalPages | 'still'

/** The legal pages of the site, as the user chose for decision 35. */
const sitePages: LegalPages = { terms: paths.terms, privacy: paths.privacy }

/** The legal links, in their order. */
const legalLinks = [
  { page: 'terms', label: 'Terms' },
  { page: 'privacy', label: 'Privacy' },
] as const satisfies readonly { page: keyof LegalPages; label: string }[]

/**
 * The legal pages in a row, which wraps on a narrow screen. `pages` gives
 * other targets for the same links, such as the pages of a phone app or
 * `still`. Without it, the links open the legal pages of the site.
 */
export function LegalLinks(props: {
  align?: 'start' | 'center'
  pages?: LegalTargets
}) {
  const pages = props.pages ?? sitePages
  return (
    <nav
      aria-label="Legal"
      className={classes(styles.row, props.align === 'center' && styles.center)}
    >
      {legalLinks.map((link) =>
        pages === 'still' ? (
          <span className={styles.link} key={link.page}>
            {link.label}
          </span>
        ) : (
          <ScreenLink
            className={styles.link}
            key={link.page}
            to={pages[link.page]}
          >
            {link.label}
          </ScreenLink>
        ),
      )}
    </nav>
  )
}
