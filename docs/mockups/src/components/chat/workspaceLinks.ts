import { parseRoute } from '../../../../../src/app/router'
import {
  webAddressParts,
  type WebAddressPart,
  type WebLinkContext,
} from '../../../../../src/markdown/web-links'
import { appDomain } from '../../brand'
import type { Attachment } from '../../fixtures/attachments'
import type { ChatRow, ChatSession } from './chatWorkspaces'
import {
  mentionParts,
  type AttachedPart,
  type MentionPart,
} from './fileMentions'

/**
 * A part of a text: plain text, code in backticks, a link, a mention of a
 * file or a folder, or a mention of an attached file of the message. Code
 * whose text, without the spaces at its ends, is one web address gives
 * that address as `href`.
 */
export type TextPart =
  | WebAddressPart
  | { kind: 'code'; text: string; href?: string }
  | MentionPart
  | AttachedPart

/** Plain text with its links, and with its mentions when `mentions` asks. */
function plainParts(
  text: string,
  mentions: boolean,
  files: readonly Attachment[],
): TextPart[] {
  if (!mentions) return webAddressParts(text)
  return mentionParts(text, files).flatMap((part): TextPart[] =>
    part.kind === 'text' ? webAddressParts(part.text) : [part],
  )
}

/** Code, with the web address that it holds alone, if any. */
function codePart(text: string): TextPart {
  const parts = webAddressParts(text.trim(), false)
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

/** The mockups supply the app origin and the router's page check. */
export const linkContext: WebLinkContext = {
  appOrigin: `https://${appDomain}`,
  isAppPage: (url) =>
    parseRoute(url.pathname, url.search).screen !== 'not-found',
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
