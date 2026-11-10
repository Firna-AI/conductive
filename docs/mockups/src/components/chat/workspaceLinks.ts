import type { WorkspaceRow } from '../workspaces/sections'
import { mentionParts, type MentionPart } from './fileMentions'

/**
 * A part of a text: plain text, code in backticks, a link, or a mention of
 * a file or a folder.
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

/** Plain text with its links, and with its mentions when `mentions` asks. */
function plainParts(text: string, mentions: boolean): TextPart[] {
  if (!mentions) return linkParts(text)
  return mentionParts(text).flatMap((part): TextPart[] =>
    part.kind === 'text' ? linkParts(part.text) : [part],
  )
}

/**
 * Splits a text into plain text, code, links, and mentions. In a sent
 * message or an answer, `code` is true: each part in backticks is code,
 * and a link or a mention in it stays code. A message box keeps plain
 * text, so it reads no code. Only the text of a member, in a message box
 * or a sent message, reads mentions, so `mentions` is false in an answer.
 */
export function textParts(
  text: string,
  code: boolean,
  mentions = false,
): TextPart[] {
  if (!code) return plainParts(text, mentions)
  return text
    .split('`')
    .flatMap((part, index): TextPart[] =>
      index % 2 === 1
        ? [{ kind: 'code', text: part }]
        : plainParts(part, mentions),
    )
}

/**
 * The row of the workspace that a link names. The link must have the
 * origin of the app and lead to a page of a workspace, which can be one of
 * its tabs. The URL parser resolves odd parts such as `..` first. Only a
 * workspace in the list of the org of the reader matches. So a link to
 * another org, or to a workspace that the reader cannot see, finds none
 * and stays plain text.
 */
export function linkedWorkspace(
  href: string,
  rows: readonly WorkspaceRow[],
): WorkspaceRow | undefined {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  const [, orgsPart, org, workspacesPart, id] = url.pathname.split('/')
  if (orgsPart !== 'orgs' || workspacesPart !== 'workspaces') return undefined
  const link = `${url.origin}/orgs/${org}/workspaces/${id}`
  return rows.find((row) => row.workspace.link === link)
}
