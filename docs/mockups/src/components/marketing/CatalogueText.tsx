import type { ReactNode } from 'react'
import type { SitePage, Text } from '../../../../../src/marketing/legal-text'
import { paths } from '../../paths'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import { RunningText, type TextLinkRenderer } from './RunningText'

/** The catalogue page of each page of the site. */
const sitePages: Readonly<Record<SitePage, string>> = {
  home: paths.marketing,
  pricing: paths.pricing,
  terms: paths.terms,
  privacy: paths.privacy,
  fromConductor: paths.fromConductor,
  changelog: paths.changelog,
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

/** A link of running text to the mockup of its page, or to an email. */
const catalogueLink: TextLinkRenderer = ({ target, className, children }) =>
  'page' in target ? (
    <ScreenLink className={className} to={sitePages[target.page]}>
      {children}
    </ScreenLink>
  ) : (
    <MailLink address={target.mail} className={className}>
      {children}
    </MailLink>
  )

/** Running text of the site in a mockup, with links to the catalogue. */
export function CatalogueText(props: { text: Text }) {
  return <RunningText link={catalogueLink} text={props.text} />
}
