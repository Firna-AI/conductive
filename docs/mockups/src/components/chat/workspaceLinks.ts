import type { Attachment } from '../../fixtures/attachments'
import type { ChatRow, ChatSession } from './chatWorkspaces'
import {
  mentionParts,
  type AttachedPart,
  type MentionPart,
} from './fileMentions'
import { skillParts, type SkillPart } from './skillMentions'

/**
 * A part of a text: plain text, code in backticks, a link, a mention of a
 * file or a folder, a mention of an attached file of the message, or a
 * skill.
 */
export type TextPart =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | {
      kind: 'link'
      href: string
      /** The link as the text has it, such as a Markdown link. */
      source: string
    }
  | MentionPart
  | AttachedPart
  | SkillPart

/**
 * A Markdown link to a web address, or a bare web address. A bare address
 * does not end with punctuation, so a full stop after it stays text.
 */
const linkPattern =
  /\[[^\]\n]*\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]]/g

function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = []
  let end = 0
  for (const match of text.matchAll(linkPattern)) {
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push({ kind: 'link', href: match[1] ?? match[0], source: match[0] })
    end = match.index + match[0].length
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

/**
 * Plain text with its links, and with its mentions and its skills when
 * `mentions` asks.
 */
function plainParts(
  text: string,
  mentions: boolean,
  files: readonly Attachment[],
): TextPart[] {
  if (!mentions) return linkParts(text)
  return mentionParts(text, files).flatMap((part): TextPart[] =>
    part.kind === 'text'
      ? skillParts(part.text).flatMap((piece): TextPart[] =>
          piece.kind === 'text' ? linkParts(piece.text) : [piece],
        )
      : [part],
  )
}

/**
 * Splits a text into plain text, code, links, mentions, and skills. In a
 * sent message or an answer, `code` is true: each part in backticks is
 * code, and a link, a mention, or a skill in it stays code. A message box
 * keeps plain text, so it reads no code. Only the text of a member, in a
 * message box or a sent message, reads mentions and skills, so `mentions`
 * is false in an answer.
 * A mention of the copy path of one of the `files` of a sent message is
 * the mention of that file.
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
      index % 2 === 1
        ? [{ kind: 'code', text: part }]
        : plainParts(part, mentions, files),
    )
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
 * workspace that the reader cannot see, finds none and stays plain text.
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
