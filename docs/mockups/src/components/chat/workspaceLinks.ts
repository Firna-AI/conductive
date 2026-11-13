import { parseRoute } from '../../../../../src/app/router'
import { appDomain } from '../../brand'
import type { Attachment } from '../../fixtures/attachments'
import type { ChatRow, ChatSession } from './chatWorkspaces'
import {
  mentionParts,
  type AttachedPart,
  type MentionPart,
} from './fileMentions'

/** A link of a text: a bare web address, or a Markdown link. */
export type LinkPart = {
  kind: 'link'
  href: string
  /** The link as the text has it, such as a Markdown link. */
  source: string
  /** The label of a Markdown link. A bare address has none. */
  label?: string
}

/** A part of text that shows as typed: plain text, or a link. */
export type PlainPart = { kind: 'text'; text: string } | LinkPart

/**
 * A part of a text: plain text, code in backticks, a link, a mention of a
 * file or a folder, or a mention of an attached file of the message. Code
 * whose text, without the spaces at its ends, is one web address gives
 * that address as `href`.
 */
export type TextPart =
  | PlainPart
  | { kind: 'code'; text: string; href?: string }
  | MentionPart
  | AttachedPart

/**
 * A Markdown link to a web address, with its label on one line, or a bare
 * web address up to a space or an angle bracket. `bareLink` then finds the
 * end of a bare address.
 */
const linkPattern =
  /\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>]+/g

/** A bare web address, as `linkPattern` reads one. */
const barePattern = /https?:\/\/[^\s<>]+/g

/** The marks at the end of a bare address that stay out of it. */
const endMarks = new Set([...'.,;:!?\'"*_~]'])

/** How many times a character stands in a text. */
function count(text: string, char: string): number {
  return text.split(char).length - 1
}

/**
 * Whether the last character of a bare address stays out of it, as on
 * GitHub: punctuation, quotes, `*`, `_`, `~`, and `]`. A `)` stays in only
 * when it closes a `(` inside the address.
 */
function endsOutside(address: string): boolean {
  const last = address.at(-1) ?? ''
  if (last === ')') return count(address, ')') > count(address, '(')
  return endMarks.has(last)
}

/** A bare address, without the marks at its end that stay out of it. */
function bareLink(found: string): LinkPart {
  let address = found
  while (endsOutside(address)) address = address.slice(0, -1)
  return { kind: 'link', href: address, source: address }
}

/** Splits text into plain text and the links that `pattern` finds. */
function partsOf(text: string, pattern: RegExp): PlainPart[] {
  const parts: PlainPart[] = []
  let end = 0
  for (const match of text.matchAll(pattern)) {
    const [whole, label, target] = match
    const link: LinkPart =
      target === undefined
        ? bareLink(whole)
        : { kind: 'link', href: target, source: whole, label }
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push(link)
    end = match.index + link.source.length
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

/**
 * Splits text into plain text and its bare web addresses, with no Markdown
 * links, as text that shows as typed.
 */
export function bareParts(text: string): PlainPart[] {
  return partsOf(text, barePattern)
}

/** Plain text with its links, and with its mentions when `mentions` asks. */
function plainParts(
  text: string,
  mentions: boolean,
  files: readonly Attachment[],
): TextPart[] {
  if (!mentions) return partsOf(text, linkPattern)
  return mentionParts(text, files).flatMap((part): TextPart[] =>
    part.kind === 'text' ? partsOf(part.text, linkPattern) : [part],
  )
}

/** Code, with the web address that it holds alone, if any. */
function codePart(text: string): TextPart {
  const parts = bareParts(text.trim())
  const [only] = parts
  return parts.length === 1 && only?.kind === 'link'
    ? { kind: 'code', text, href: only.href }
    : { kind: 'code', text }
}

/**
 * Splits a text into plain text, code, links, and mentions. In a sent
 * message or an answer, `code` is true: each part in backticks is code,
 * and a link or a mention in it is no chip. Code that holds only a web
 * address gives that address. A message box keeps plain text, so it reads
 * no code. Only the text of a member, in a message box or a sent message,
 * reads mentions, so `mentions` is false in an answer. A mention of the
 * copy path of one of the `files` of a sent message is the mention of
 * that file.
 */
export function textParts(
  text: string,
  code: boolean,
  mentions = false,
  files: readonly Attachment[] = [],
): TextPart[] {
  if (!code) return plainParts(text, mentions, files)
  return text
    .split('`')
    .flatMap((part, index): TextPart[] =>
      index % 2 === 1 ? [codePart(part)] : plainParts(part, mentions, files),
    )
}

/** Where a web link leads, and so what a press on it opens. */
export type WebLink =
  /** A page of the app, which opens in the app, as a chip does. */
  | { kind: 'app'; url: URL }
  /** A server of the cloud computer, whose port preview opens. */
  | { kind: 'local'; url: URL; port: number }
  /** Any other page, which opens in a new tab. */
  | { kind: 'web'; url: URL }

/** The origin of the app, whose pages open in the app. */
const appOrigin = `https://${appDomain}`

/** The hosts of a local address, as the URL parser writes them. */
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])

/** The port of an address, also when the address names none. */
function portOf(url: URL): number {
  if (url.port !== '') return Number(url.port)
  return url.protocol === 'https:' ? 443 : 80
}

/**
 * Where a web address of chat text leads, or undefined when it is no link.
 * Only `http` and `https` addresses are links. An address with a user
 * name or a password stays text, because its text can fake its host. An
 * address of the app is a link only when the router of the app reads a
 * page, so an API address stays text. The app comes before the local
 * hosts, because the app of a local dev server has a local address. A
 * local address names a server of the cloud computer of the chat.
 */
export function webLink(href: string): WebLink | undefined {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  if (url.username !== '' || url.password !== '') return undefined
  if (url.origin === appOrigin) {
    const route = parseRoute(url.pathname, url.search)
    return route.screen === 'not-found' ? undefined : { kind: 'app', url }
  }
  if (localHosts.has(url.hostname)) {
    return { kind: 'local', url, port: portOf(url) }
  }
  return { kind: 'web', url }
}

/** Characters that show nothing, such as a zero-width space. */
const invisible = /\p{Default_Ignorable_Code_Point}/gu

/**
 * Whether the label of a Markdown link reads as a web address, so that
 * the link shows its real address in place of the label. The label is
 * read as it shows, without code marks, bold marks, and invisible
 * characters. It reads as an address when it then holds `://` or starts
 * with `www.`.
 */
export function readsAsAddress(label: string): boolean {
  const shown = label
    .replaceAll('`', '')
    .replaceAll('**', '')
    .replace(invisible, '')
    .trim()
    .toLowerCase()
  return shown.includes('://') || shown.startsWith('www.')
}

/** What a link names: a workspace, and one of its sessions, if any. */
export type LinkTarget = { row: ChatRow; session?: ChatSession }

/**
 * The workspace that a link names, and its session when the link is the
 * address of a session: the link of the workspace, then `sessions` and the
 * ID of the session. The link must have the origin of the app and lead to
 * a page of a workspace, which can be one of its tabs. The URL parser
 * resolves odd parts such as `..` first. Only a workspace in the list of
 * the org of the reader matches. So a link to another org, or to a
 * workspace that the reader cannot see, finds none and is no chip.
 * Only a session that the chat read for that workspace, open or closed,
 * matches. A link to any other session names only its workspace.
 */
export function linkTarget(
  href: string,
  rows: readonly ChatRow[],
): LinkTarget | undefined {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  const [, orgsPart, org, workspacesPart, id, ...rest] = url.pathname.split('/')
  if (orgsPart !== 'orgs' || workspacesPart !== 'workspaces') return undefined
  const link = `${url.origin}/orgs/${org}/workspaces/${id}`
  const row = rows.find((item) => item.workspace.link === link)
  if (!row) return undefined
  const [sessionsPart, sessionId, ...more] = rest
  const named = sessionsPart === 'sessions' && more.length === 0
  const session = named
    ? row.sessions?.find((item) => item.id === sessionId)
    : undefined
  return { row, session }
}

/**
 * The page that a press on a link to a workspace opens, when the mockups
 * draw it: the session of a session link, or the page of the workspace. A
 * link to a closed session opens the page of its workspace, so a press
 * reopens no tab for the other members.
 */
export function linkPage(target: LinkTarget): string | undefined {
  const { row, session } = target
  return session && !session.closed ? session.to : row.to
}
