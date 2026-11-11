import { workspacePaths } from '../../src/shared/workspaces'
import type { AppEnv } from '../env'
import { requireFeatureResult } from '../features/result'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { workspaceChildId } from './workspace-path'
import { workspaceBinding } from './workspace-state'

export async function continueRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const id = workspaceChildId(path, orgId)
  if (!id) return null
  const startPath = workspacePaths.continue(orgId, id)
  const start = path === startPath && request.method === 'POST'
  const resultId =
    path.startsWith(`${startPath}/`) && ['GET', 'HEAD'].includes(request.method)
      ? path.slice(startPath.length + 1)
      : null
  if (!start && !resultId) return null
  const object = workspaceBinding(env).getByName(id)
  if (start) {
    const expectedBranch = context.body?.expectedBranch
    const allowLocalWork = context.body?.allowLocalWork
    if (
      typeof expectedBranch !== 'string' ||
      (allowLocalWork !== undefined && typeof allowLocalWork !== 'boolean')
    )
      throw new HttpError(
        400,
        'invalid_request',
        'Open the workspace and try Continue again.',
      )
    const result = requireFeatureResult(
      await object.continueWorkspace(
        orgId,
        id,
        context.user,
        {
          expectedBranch,
          ...(allowLocalWork === undefined ? {} : { allowLocalWork }),
        },
        env.APP_ORIGIN,
      ),
    )
    return Response.json(result, {
      status: result.state === 'pending' ? 202 : 200,
    })
  }
  let continueId: string
  try {
    continueId = decodeURIComponent(resultId ?? '')
  } catch {
    throw new HttpError(
      404,
      'workspace_continue_unavailable',
      'This Continue request is not available.',
    )
  }
  const result = requireFeatureResult(
    await object.readWorkspaceContinue(
      orgId,
      id,
      context.user.id,
      continueId,
      env.APP_ORIGIN,
    ),
  )
  return request.method === 'HEAD' ? new Response(null) : Response.json(result)
}
