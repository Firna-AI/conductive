import type { ReactNode } from 'react'
import type { SitePage, Text } from '../../../../../src/marketing/legal-text'
import { paths } from '../../paths'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import type { LegalTargets } from './LegalLinks'
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
 * catalogue page that `pages` gives for it. A link without a page keeps
 * its look and opens nothing. An email link writes an email.
 */
function catalogueLink(
  pages: Readonly<Record<SitePage, string | undefined>>,
): TextLinkRenderer {
  return ({ target, className, children }) => {
    if (!('page' in target)) {
      return (
        <MailLink address={target.mail} className={className}>
          {children}
        </MailLink>
      )
    }
    const to = pages[target.page]
    if (to === undefined) return <span className={className}>{children}</span>
    return (
      <ScreenLink className={className} to={to}>
        {children}
      </ScreenLink>
    )
  }
}

/** The links of running text to the mockups of the pages of the site. */
const siteLink = catalogueLink(sitePages)

/** The links of running text for each form of `legal`. */
function linkFor(legal: LegalTargets | undefined): TextLinkRenderer {
  if (legal === undefined) return siteLink
  if (legal === 'still') {
    return catalogueLink({ ...sitePages, terms: undefined, privacy: undefined })
  }
  return catalogueLink({ ...sitePages, ...legal })
}

/**
 * Running text of the site in a mockup, with links to the catalogue.
 * `legal` gives other targets for the links to the legal pages, such as
 * the pages of a phone app, or `still` for links that open nothing.
 */
export function CatalogueText(props: { text: Text; legal?: LegalTargets }) {
  return <RunningText link={linkFor(props.legal)} text={props.text} />
}
