import { parseRoute, routes } from '../../app/router'
import { appAddress } from '../../markdown/web-links'
import type { Workspace } from '../../shared/workspaces'

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
  /** The session of a session link, or null for another page of the workspace. */
  sessionId: string | null
}

/** The origin of a link, such as the link of a workspace, or null. */
export function originOf(link: string): string | null {
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
  return {
    workspace,
    to: appAddress(url),
    sessionId: route.session ?? null,
  }
}

/**
 * The target of a session that the chat names by its IDs, such as the
 * session whose agent stopped a turn: the target of the link of that
 * session. Only a workspace in the list matches, as for `linkTarget`.
 */
export function sessionTarget(
  session: { workspaceId: string; sessionId: string },
  links: WorkspaceLinks,
): LinkTarget | undefined {
  const workspace = links.workspaces?.find(
    (item) => item.id === session.workspaceId,
  )
  if (!workspace) return undefined
  return {
    workspace,
    to: routes.session(links.orgId, session.workspaceId, session.sessionId),
    sessionId: session.sessionId,
  }
}
