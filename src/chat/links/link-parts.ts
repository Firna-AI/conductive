import { bareAddressAt, type WebLink } from '../../markdown/web-links'

// The link parts of chat text: a web link with its words, and inline code
// that holds one address alone.

/**
 * A web address of a sent message that is no chip: where it leads, and the
 * address as the text has it.
 */
export interface LinkPart {
  kind: 'link'
  link: WebLink
  text: string
}

/**
 * Inline code. When its text, without the spaces at its ends, is one web
 * address that is a link, `link` says where it leads.
 */
export type CodePart = { kind: 'code'; text: string; link?: WebLink }

/** Where a web address leads, or undefined when it stays text. */
export type WebLinkOf = (href: string) => WebLink | undefined

/** Inline code, with the link of the one web address that it holds alone. */
export function codePart(text: string, web: WebLinkOf): CodePart {
  const address = text.trim()
  const link = bareAddressAt(address, 0) === address ? web(address) : undefined
  return link ? { kind: 'code', text, link } : { kind: 'code', text }
}
