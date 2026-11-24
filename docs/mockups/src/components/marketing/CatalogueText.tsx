import type { ReactNode } from 'react'
import type { SitePage, Text } from '../../../../../src/marketing/legal-text'
import { paths } from '../../paths'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import type { LegalPages } from './LegalLinks'
import {
  RunningText,
  type TextLinkRenderer,
} from '../../../../../src/ui/components/marketing/RunningText'

/** The catalogue page of each page of the site. */
const sitePages: Readonly<Record<SitePage, string>> = {
  home: paths.marketing,
  pricing: paths.pricing,
  terms: paths.terms,
  privacy: paths.privacy,
}

/** A link that writes an email. A picture of a page has no address. */
export function MailLink(props: {
  address: string
  className: string
  children: ReactNode
}) {
  const href = useOutsideHref(`mailto:${props.address}`)
  return (
    <a className={props.className} href={href}>
      {props.children}
    </a>
  )
}

/**
 * The links of running text: each link to a page of the site opens the
 * catalogue page that `pages` gives for it, and an email link writes an
 * email.
 */
function catalogueLink(
  pages: Readonly<Record<SitePage, string>>,
): TextLinkRenderer {
  return ({ target, className, children }) =>
    'page' in target ? (
      <ScreenLink className={className} to={pages[target.page]}>
        {children}
      </ScreenLink>
    ) : (
      <MailLink address={target.mail} className={className}>
        {children}
      </MailLink>
    )
}

/** The links of running text to the mockups of the pages of the site. */
const siteLink = catalogueLink(sitePages)

/**
 * Running text of the site in a mockup, with links to the catalogue.
 * `legal` gives other pages for the links to the legal pages, such as
 * those of a phone app.
 */
export function CatalogueText(props: { text: Text; legal?: LegalPages }) {
  const link = props.legal
    ? catalogueLink({ ...sitePages, ...props.legal })
    : siteLink
  return <RunningText link={link} text={props.text} />
}
