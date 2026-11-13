import { bareAddressAt, type WebLink } from '../../markdown/web-links'
import { tokens } from './chat-tokens'

// The link parts of chat text: a web link with its words, and inline code
// that holds one address alone.

/** A word of a link: text, in bold or not, or code. */
export type LinkWord =
  | { kind: 'text'; text: string; strong: boolean }
  | { kind: 'code'; text: string }

/**
 * A web address that is no chip: where it leads, and its words. The words
 * are the label of a Markdown link of an answer, with its code and bold,
 * or the address as the text has it.
 */
export interface LinkPart {
  kind: 'link'
  link: WebLink
  words: readonly LinkWord[]
  strong: boolean
}

/**
 * Inline code. When its text, without the spaces at its ends, is one web
 * address that is a link, `link` says where it leads.
 */
export type CodePart = { kind: 'code'; text: string; link?: WebLink }

/** Where a web address leads, or undefined when it stays text. */
export type WebLinkOf = (href: string) => WebLink | undefined

/** The words of an address, as the text has it. */
export function addressWords(href: string): LinkWord[] {
  return [{ kind: 'text', text: href, strong: false }]
}

/**
 * The words of the label of a Markdown link, with its code and bold. Its
 * `**` marks bold only inside the label, and bold ends at code, as in the
 * rest of an answer.
 */
export function labelWords(label: string): LinkWord[] {
  const words: LinkWord[] = []
  let strong = false
  // This reading finds no link and no mention.
  const reading = { marks: true, links: false, mentions: () => false }
  for (const token of tokens(label, reading)) {
    if (token.kind === 'mark') strong = !strong
    else if (token.kind === 'code') {
      strong = false
      words.push(token)
    } else if (token.kind === 'text') {
      const last = words.at(-1)
      if (last?.kind === 'text' && last.strong === strong) {
        last.text += token.text
      } else words.push({ kind: 'text', text: token.text, strong })
    }
  }
  return words
}

/** Inline code, with the link of the one web address that it holds alone. */
export function codePart(text: string, web: WebLinkOf): CodePart {
  const address = text.trim()
  const link = bareAddressAt(address, 0) === address ? web(address) : undefined
  return link ? { kind: 'code', text, link } : { kind: 'code', text }
}
