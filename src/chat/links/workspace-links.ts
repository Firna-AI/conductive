import { parseRoute } from '../../app/router'
import type { Workspace } from '../../shared/workspaces'

/** A part of a text: plain text, code in backticks, or a link. */
export type TextPart =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | {
      kind: 'link'
      /** The web address of the link. */
      href: string
      /** The link as the text has it, such as a Markdown link. */
      source: string
    }

/** The workspaces whose links show as chips: the visible ones of one org. */
export interface WorkspaceLinks {
  orgId: string
  /**
   * The workspaces of the org that the reader may see, with the archived
   * ones, or null while they load.
   */
  workspaces: readonly Workspace[] | null
}

/** The workspace that a link names, and the page of the app that it opens. */
export interface LinkTarget {
  workspace: Workspace
  /** The path, the query, and the hash of the page, as the router reads them. */
  to: string
}

/** A part of a text with chips: plain text, code, or a workspace link. */
export type LinkedPart =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'chip'; source: string; target: LinkTarget }

/**
 * A Markdown link to a web address, whose target can stand in angle
 * brackets, or a bare web address. A bare address does not end with
 * punctuation, so a full stop after it stays text. A web address holds no
 * backtick, so a backtick after it ends it.
 */
const linkPattern =
  /\[[^\]\n]*\]\(<?(https?:\/\/[^\s<>)`]+)>?\)|https?:\/\/[^\s<>`]*[^\s<>`.,;:!?'")\]]/g

/** Splits a text into plain text and links. It reads no code. */
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
 * stays code. A message field keeps plain text, so it reads no code.
 */
export function textParts(text: string, code: boolean): TextPart[] {
  if (!code) return linkParts(text)
  return text
    .split('`')
    .flatMap((part, index): TextPart[] =>
      index % 2 === 1 ? [{ kind: 'code', text: part }] : linkParts(part),
    )
}

function originOf(link: string): string | null {
  try {
    return new URL(link).origin
  } catch {
    return null
  }
}

/**
 * Whether a link reads as a page of a workspace of the org, whatever list
 * the reader has. Such a link can become a chip once the list holds its
 * workspace.
 */
export function namesOrgWorkspace(href: string, orgId: string): boolean {
  try {
    const url = new URL(href)
    const route = parseRoute(url.pathname, url.search)
    return route.screen === 'workspace' && route.orgId === orgId
  } catch {
    return false
  }
}

/**
 * The workspace that a link names, or undefined. The URL parser resolves the
 * link as a browser does, so a link with `..` names the workspace whose page
 * it opens. The link must have the origin of the workspace links, and the
 * router must read a page of one workspace of the org, which can be one of
 * its tabs. Only a workspace in the list matches. So a link to another org,
 * or to a workspace that the reader may not see, names none.
 */
export function linkTarget(
  href: string,
  links: WorkspaceLinks,
): LinkTarget | undefined {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return undefined
  }
  const route = parseRoute(url.pathname, url.search)
  if (route.screen !== 'workspace' || route.orgId !== links.orgId) {
    return undefined
  }
  const workspace = links.workspaces?.find(
    (item) => item.id === route.workspaceId,
  )
  if (!workspace || originOf(workspace.link) !== url.origin) return undefined
  return { workspace, to: `${url.pathname}${url.search}${url.hash}` }
}

/**
 * Splits a text into plain text, code, and chips, as `textParts` reads it.
 * Each workspace link becomes a chip, and a Markdown link to a workspace is
 * the chip alone. Every other link stays the text that the text has.
 */
export function linkedParts(
  text: string,
  links: WorkspaceLinks,
  code: boolean,
): LinkedPart[] {
  const parts: LinkedPart[] = []
  const pushText = (value: string) => {
    const last = parts.at(-1)
    if (last?.kind === 'text') last.text += value
    else parts.push({ kind: 'text', text: value })
  }
  for (const part of textParts(text, code)) {
    if (part.kind === 'code') {
      parts.push(part)
      continue
    }
    if (part.kind === 'text') {
      pushText(part.text)
      continue
    }
    const target = linkTarget(part.href, links)
    if (target) parts.push({ kind: 'chip', source: part.source, target })
    else pushText(part.source)
  }
  return parts
}
