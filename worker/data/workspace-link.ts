import { routes } from '../../src/app/router'
import type { Workspace } from '../../src/shared/workspaces'

/** Saved records from before workspace links have neither field. */
export type WorkspaceSnapshot = Omit<Workspace, 'number' | 'link'> &
  Partial<Pick<Workspace, 'number' | 'link'>>

export interface WorkspaceLinkContext {
  orgId: string
  workspaceId: string
  number: number
  origin: string
}

export function workspaceLink(
  origin: string,
  orgId: string,
  workspaceId: string,
): string {
  return new URL(routes.workspace(orgId, workspaceId), origin).href
}

export function presentWorkspace(
  snapshot: WorkspaceSnapshot,
  context: WorkspaceLinkContext,
): Workspace {
  return {
    ...snapshot,
    number: context.number,
    link: workspaceLink(context.origin, context.orgId, context.workspaceId),
  }
}
