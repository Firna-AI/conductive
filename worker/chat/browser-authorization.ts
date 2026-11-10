import { workspacePath } from '../../src/shared/workspaces'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { gate, gateAccess, type RequestContext } from '../security/gate'
import { findChatWorkspace } from './queries'
import type { WorkspaceRecord } from './types'
import { appOrigin } from '../security/app-origin'
import type { WorkspaceLinkContext } from '../data/workspace-link'

export interface BrowserAccess {
  context: RequestContext
  workspace: WorkspaceRecord
  suffix: string
  presentation: WorkspaceLinkContext
}

export async function authorizeChatBrowser(
  request: Request,
  env: AppEnv,
  now: number,
  parsedBody?: RequestContext['body'],
): Promise<BrowserAccess> {
  const context =
    parsedBody === undefined
      ? await gate(request, env, now)
      : { ...(await gateAccess(request, env, now)), body: parsedBody }
  const path = new URL(request.url).pathname
  const match = path.match(/^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)(?:\/|$)/)
  let workspaceId: string | undefined
  try {
    workspaceId = match ? decodeURIComponent(match[1]) : undefined
  } catch {
    /* An unreadable ID has no workspace. */
  }
  const workspace =
    context.org && workspaceId
      ? await findChatWorkspace(env.DB, context.org.id, workspaceId)
      : null
  if (!workspace || !context.org)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  if (
    workspace.state === 'inactive' &&
    !['GET', 'HEAD'].includes(request.method)
  )
    throw new HttpError(
      409,
      'workspace_not_active',
      'Activate this workspace to start a session.',
    )
  return {
    context,
    workspace,
    presentation: {
      origin: appOrigin(request, env),
      orgId: workspace.orgId,
      workspaceId: workspace.id,
      number: workspace.number,
    },
    suffix: path.slice(workspacePath(context.org.id, workspace.id).length),
  }
}
