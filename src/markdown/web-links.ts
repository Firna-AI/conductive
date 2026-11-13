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
const markdownTarget = /\(<?(https?:\/\/[^\s<>)`]+)>?\)/y
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

/** The web target in parentheses at `at`, with optional angle brackets. */
export function markdownTargetAt(
  text: string,
  at: number,
): { href: string; length: number } | null {
  markdownTarget.lastIndex = at
  const match = markdownTarget.exec(text)
  return match ? { href: match[1] ?? '', length: match[0].length } : null
}

/** Text and its addresses. With `markdown`, a Markdown link stays one part. */
export function webAddressParts(
  text: string,
  markdown = true,
): WebAddressPart[] {
  const pattern = new RegExp(
    markdown
      ? `\\[([^\\]\\n]*)\\]${markdownTarget.source}|${barePattern.source}`
      : barePattern.source,
    'g',
  )
  const parts: WebAddressPart[] = []
  let end = 0
  for (const match of text.matchAll(pattern)) {
    const [whole, label, target] = match
    const href = target ?? bareAddressAt(whole, 0)
    if (!href) continue
    const source = target === undefined ? href : whole
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push(
      target === undefined
        ? { kind: 'link', href, source }
        : { kind: 'link', href, source, label },
    )
    end = match.index + source.length
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

/** Tests the visible label, without code, bold, or invisible characters. */
export function readsAsAddress(label: string): boolean {
  const shown = label
    .replaceAll('`', '')
    .replaceAll('**', '')
    .replace(invisible, '')
    .trim()
    .toLowerCase()
  return shown.includes('://') || shown.startsWith('www.')
}
