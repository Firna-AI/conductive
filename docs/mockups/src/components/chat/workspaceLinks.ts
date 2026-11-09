import type { WorkspaceRow } from '../workspaces/sections'

/** A part of a text: plain text, code in backticks, or a link. */
export type TextPart =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | {
      kind: 'link'
      href: string
      /** The link as the text has it, such as a Markdown link. */
      source: string
    }

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
 * Splits a text into plain text, code, and links. In a sent message or an
 * answer, `code` is true: each part in backticks is code, and a link in it
 * stays code. A message box keeps plain text, so it reads no code.
 */
export function textParts(text: string, code: boolean): TextPart[] {
  if (!code) return linkParts(text)
  return text
    .split('`')
    .flatMap((part, index): TextPart[] =>
      index % 2 === 1 ? [{ kind: 'code', text: part }] : linkParts(part),
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
