import { productDomain, productName } from '../../docs/mockups/src/brand'
import type { sitePaths } from './links'

/**
 * Running text of the text pages of the site and of sign-in, without
 * markup. The site renders it as HTML, and the app and the mockups render
 * it with React, so every surface shows the same words.
 */

/** A page of the site that running text links to. */
export type SitePage = keyof typeof sitePaths

/** A fact that the operator or the lawyer still confirms or writes. */
export type DraftField = { readonly draft: string }

/** Where a link of running text leads: a page of the site, or an email address. */
export type LinkTarget = { readonly page: SitePage } | { readonly mail: string }

/** A link of running text, with its words. */
export type TextLink = LinkTarget & { readonly text: string }

/** A part of a sentence: plain words, a draft field, or a link. */
export type Inline = string | DraftField | TextLink

/** Running text, such as a paragraph or one item of a list. */
export type Text = readonly Inline[]

/** A paragraph or a list of a text page. */
export type Block =
  | { readonly kind: 'paragraph'; readonly text: Text }
  | { readonly kind: 'list'; readonly items: readonly Text[] }

/** One section of a legal page: a heading, and its paragraphs and lists. */
export type LegalSection = {
  readonly title: string
  readonly blocks: readonly Block[]
}

/** A legal page of the site, such as the terms or the privacy notice. */
export type LegalDocument = {
  readonly title: string
  readonly description: string
  readonly lead: Text
  readonly sections: readonly LegalSection[]
}

/** A draft field: a fact that waits for the operator or the lawyer. */
export function draft(text: string): DraftField {
  return { draft: text }
}

/** A link to a page of the site. */
export function link(page: SitePage, text: string): TextLink {
  return { page, text }
}

/** A link that writes an email to the address, with the address as its words. */
export function mailLink(address: string): TextLink {
  return { mail: address, text: address }
}

function collapse(words: string): string {
  return words.replace(/\s+/g, ' ')
}

/**
 * Running text from a template. Each run of white space in the template
 * becomes one space, and the text has no space at its ends, so the source
 * can wrap its lines.
 */
export function text(
  strings: TemplateStringsArray,
  ...values: readonly Inline[]
): Text {
  const parts: Inline[] = []
  const add = (part: Inline) => {
    const last = parts.at(-1)
    if (typeof part === 'string' && typeof last === 'string') {
      parts[parts.length - 1] = last + part
    } else if (part !== '') {
      parts.push(part)
    }
  }
  strings.forEach((words, index) => {
    add(collapse(words))
    if (index < values.length) add(values[index])
  })
  const first = parts[0]
  if (typeof first === 'string') parts[0] = first.trimStart()
  const last = parts.at(-1)
  if (typeof last === 'string') parts[parts.length - 1] = last.trimEnd()
  return parts.filter((part) => part !== '')
}

/** A paragraph from a template, as `text` builds it. */
export function paragraph(
  strings: TemplateStringsArray,
  ...values: readonly Inline[]
): Block {
  return { kind: 'paragraph', text: text(strings, ...values) }
}

/** A list with one item for each text. */
export function list(...items: readonly Text[]): Block {
  return { kind: 'list', items }
}

/** The titles of the legal pages. Links to the pages use the same words. */
export const legalTitles = {
  terms: 'Terms of use',
  privacy: 'Privacy notice',
} as const

/** The label above the title of each legal page. */
export const legalLabel = 'Legal'

/**
 * The notice at the top of each legal page, as decision 35 asks: a lawyer
 * reviews the text before the app opens to other people.
 */
export const draftNotice = {
  title: 'Draft for lawyer review',
  text: `A lawyer reviews this text before ${productName} opens to other people. Each marked field waits for a fact that the operator confirms.`,
} as const

/** The address for reports of abuse, in the footer and the terms. */
export const abuseAddress = `abuse@${productDomain}`

/** The page for an address that the site does not have. */
export const notFoundText = {
  label: 'Not found',
  title: 'Page not found',
  lead: text`Check the address, or go to the ${link('home', 'home page')}.`,
} as const

/**
 * The agreement next to Continue with GitHub. Each sign-in accepts the
 * current terms when the user continues, and the privacy notice says how
 * their data is used.
 */
export const termsAgreement: Text = text`By continuing, you agree to the
  ${link('terms', legalTitles.terms)}. The
  ${link('privacy', legalTitles.privacy)} says how ${productName} uses your
  data.`
