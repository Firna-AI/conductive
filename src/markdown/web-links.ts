import { lineTargets } from './markdown-destination'

/** A web address in text, with its source and optional Markdown label. */
export type WebAddressLink = {
  kind: 'link'
  href: string
  source: string
  label?: string
}

export type WebAddressPart = { kind: 'text'; text: string } | WebAddressLink

/** The caller supplies the app origin and the check for a page of the app. */
export interface WebLinkContext {
  appOrigin: string
  isAppPage: (url: URL) => boolean
}

/** Where an accepted web address leads. An app page has an internal address. */
export type WebLink =
  | { kind: 'app'; url: URL; to: string }
  | { kind: 'local'; url: URL; port: number }
  | { kind: 'web'; url: URL }

const barePattern = /https?:\/\/[^\s<>`]+/y
const markdownLabel = /\[([^\]\n]*)\]\(/y
const endMarks = new Set([...'.,;:!?\'"*_~]'])
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])
const invisible = /\p{Default_Ignorable_Code_Point}/gu

/** The raw path segments, joined with one slash, then the query and hash. */
export function appAddress(url: URL): string {
  const path = url.pathname
    .split('/')
    .filter((part) => part !== '')
    .join('/')
  return `/${path}${url.search}${url.hash}`
}

/** Where an address leads, or undefined for a refused or invalid address. */
export function webLink(
  href: string,
  context: WebLinkContext,
): WebLink | undefined {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  if (url.username !== '' || url.password !== '') return undefined
  if (url.origin === context.appOrigin) {
    return context.isAppPage(url)
      ? { kind: 'app', url, to: appAddress(url) }
      : undefined
  }
  if (localHosts.has(url.hostname)) {
    const port =
      url.port === ''
        ? url.protocol === 'https:'
          ? 443
          : 80
        : Number(url.port)
    return { kind: 'local', url, port }
  }
  return { kind: 'web', url }
}

/** The bare web address at `at`, without trailing marks outside the address. */
export function bareAddressAt(text: string, at: number): string | null {
  barePattern.lastIndex = at
  const found = barePattern.exec(text)?.[0]
  if (!found) return null
  let address = found
  let extraCloses = address.split(')').length - address.split('(').length
  while (address !== '') {
    const last = address.at(-1) ?? ''
    if (last === ')' && extraCloses > 0) extraCloses -= 1
    else if (!endMarks.has(last)) break
    address = address.slice(0, -1)
  }
  return address || null
}

/**
 * Text and its addresses. With `markdown`, a Markdown link stays one part.
 * Without it, only the address of a Markdown link is a part, and the rest
 * of the link, such as its label and its link title, stays text. A Markdown
 * link stands on one line, as in chat text, so no chip takes in a line
 * break.
 */
export function webAddressParts(
  text: string,
  markdown = true,
): WebAddressPart[] {
  const parts: WebAddressPart[] = []
  const targetAt = lineTargets(text)
  let end = 0
  for (let index = 0; index < text.length;) {
    let href: string | null = null
    let source = ''
    let label: string | undefined
    let start = index
    let next = index
    if (text[index] === '[') {
      markdownLabel.lastIndex = index
      const match = markdownLabel.exec(text)
      const target = match ? targetAt(index + match[0].length) : null
      if (target) {
        href = target.destination
        next = target.next
        if (markdown) {
          source = text.slice(index, target.next)
          label = match?.[1]
        } else {
          start = target.start
          source = text.slice(target.start, target.end)
        }
      }
    }
    if (href === null && text.startsWith('http', index)) {
      href = bareAddressAt(text, index)
      source = href ?? ''
      next = index + source.length
    }
    if (href === null) {
      index += 1
      continue
    }
    if (start > end) parts.push({ kind: 'text', text: text.slice(end, start) })
    parts.push(
      label === undefined
        ? { kind: 'link', href, source }
        : { kind: 'link', href, source, label },
    )
    end = start + source.length
    index = next
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

/**
 * Whether a Markdown label hides where its link leads, so that the link
 * shows its real address in place of the label. The label is tested as it
 * shows, without code marks, bold marks, invisible characters, or spaces
 * at its ends. It hides the address when it then shows nothing, holds
 * `://`, or starts with `www.` in any case.
 */
export function labelHidesAddress(label: string): boolean {
  const shown = label
    .replaceAll('`', '')
    .replaceAll('**', '')
    .replace(invisible, '')
    .trim()
    .toLowerCase()
  return shown === '' || shown.includes('://') || shown.startsWith('www.')
}
