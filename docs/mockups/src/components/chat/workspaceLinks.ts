import { parseRoute } from '../../../../../src/app/router'
import {
  linkTarget as readTarget,
  type LinkTarget as ReadTarget,
  type WorkspaceLinks,
} from '../../../../../src/chat/links/workspace-links'
import {
  webLink,
  type WebLink,
  type WebLinkContext,
} from '../../../../../src/markdown/web-links'
import type { Workspace as AppWorkspace } from '../../../../../src/shared/generated/Workspace'
import { appDomain } from '../../../../../src/shared/brand'
import { people } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import type { ChatRow, ChatSession } from './chatWorkspaces'

/** The mockups supply the app origin and the router's page check. */
const linkContext: WebLinkContext = {
  appOrigin: `https://${appDomain}`,
  isAppPage: (url) =>
    parseRoute(url.pathname, url.search).screen !== 'not-found',
}

/** Where a web address of chat text leads, or undefined when it stays text. */
export function webLinkOf(href: string): WebLink | undefined {
  return webLink(href, linkContext)
}

/** What a link names: a workspace, and one of its sessions, if any. */
export type LinkTarget = { row: ChatRow; session?: ChatSession }

/**
 * The rows that a chat finds for its chips, as the reader of the app finds
 * them: the workspaces of the app that the rows stand for, and the row of
 * each of those workspaces.
 */
export interface RowLinks {
  links: WorkspaceLinks
  rows: ReadonlyMap<AppWorkspace, ChatRow>
}

/** The IDs of the workspace and of the org in a link, as the router reads them. */
function routeIds(link: string): { id: string; orgId: string } | undefined {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return undefined
  }
  const route = parseRoute(url.pathname, url.search)
  if (route.screen !== 'workspace') return undefined
  return { id: route.workspaceId, orgId: route.orgId }
}

/**
 * The record of the app for a row. The reader of the app finds the
 * workspace of a link by the ID in the link and by the origin of the link
 * of the workspace. The row gives the other values that it holds. It holds
 * no times and no parent, so those values stay empty.
 */
function appWorkspace(
  row: ChatRow,
  ids: { id: string; orgId: string },
): AppWorkspace {
  const { workspace } = row
  const owner = people[workspace.owner]
  return {
    ...ids,
    number: workspace.number,
    link: workspace.link,
    repositoryId: workspace.repository,
    sectionId: workspace.section,
    parentId: null,
    owner: {
      id: owner.key,
      githubLogin: owner.login,
      displayName: owner.name,
      avatarUrl: null,
    },
    name: workspace.name,
    branch: workspace.branch,
    choice: { ...workspace.choice, fast: workspace.choice.fast ?? false },
    state: row.status,
    github: row.github,
    createdAt: 0,
    updatedAt: 0,
    archivedAt: null,
    restoreUntil: null,
  }
}

/**
 * The links of the rows of a chat. Each chat of the mockups is in Acme, so
 * a link to a workspace of another org names no row.
 */
export function rowLinks(rows: readonly ChatRow[]): RowLinks {
  const byWorkspace = new Map<AppWorkspace, ChatRow>()
  for (const row of rows) {
    const ids = routeIds(row.workspace.link)
    if (ids) byWorkspace.set(appWorkspace(row, ids), row)
  }
  return {
    links: { orgId: orgs.acme.id, workspaces: [...byWorkspace.keys()] },
    rows: byWorkspace,
  }
}

/**
 * The row of the workspace that a target of the reader of the app names,
 * with the session of a session link. Only a session that the chat read for
 * that workspace, open or closed, matches. A link to any other session
 * names only its workspace.
 */
export function rowTarget(
  target: ReadTarget,
  links: RowLinks,
): LinkTarget | undefined {
  const row = links.rows.get(target.workspace)
  if (!row) return undefined
  const { sessionId } = target
  const session =
    sessionId === null
      ? undefined
      : row.sessions?.find((item) => item.id === sessionId)
  return { row, session }
}

/**
 * The workspace that a link names, and its session, as the app reads the
 * link: a page of a workspace of the org, which can be one of its tabs, at
 * the origin of the link of that workspace. The URL parser resolves odd
 * parts such as `..` first. Only a workspace in the list of the org of the
 * reader matches. So a link to another org, or to a workspace that the
 * reader cannot see, finds none and is no chip.
 */
export function linkTarget(
  href: string,
  links: RowLinks,
): LinkTarget | undefined {
  const target = readTarget(href, links.links)
  return target && rowTarget(target, links)
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
