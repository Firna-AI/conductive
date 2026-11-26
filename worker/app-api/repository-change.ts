import {
  workspacePaths,
  type ChangeRepositoryRequest,
} from '../../src/shared/workspaces'
import type { AppEnv } from '../env'
import { requireFeatureResult } from '../features/result'
import { HttpError } from '../http'
import { labelRepositoryChangeResult } from '../lifecycle/repository-change-output'
import type { RequestContext } from '../security/gate'
import { workspaceChildId } from './workspace-path'
import { workspaceBinding } from './workspace-state'

function changeRequest(body: RequestContext['body']): ChangeRepositoryRequest {
  const { expectedRepositoryId, expectedBranch, repositoryId, allowWork } =
    body ?? {}
  if (
    typeof expectedRepositoryId !== 'string' ||
    typeof expectedBranch !== 'string' ||
    typeof repositoryId !== 'string' ||
    (allowWork !== undefined && typeof allowWork !== 'boolean')
  )
    throw new HttpError(
      400,
      'invalid_request',
      'Open the workspace and try the repository change again.',
    )
  return {
    expectedRepositoryId,
    expectedBranch,
    repositoryId,
    ...(allowWork === undefined ? {} : { allowWork }),
  }
}

/** Starts a repository change, and reads the result of one, as Continue does. */
export async function repositoryChangeRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const id = workspaceChildId(path, orgId)
  if (!id) return null
  const startPath = workspacePaths.repository(orgId, id)
  const start = path === startPath && request.method === 'POST'
  const resultId =
    path.startsWith(`${startPath}/`) && ['GET', 'HEAD'].includes(request.method)
      ? path.slice(startPath.length + 1)
      : null
  if (!start && !resultId) return null
  const object = workspaceBinding(env).getByName(id)
  if (start) {
    const result = requireFeatureResult(
      await labelRepositoryChangeResult(
        env,
        { id, orgId },
        await object.changeWorkspaceRepository(
          orgId,
          id,
          context.user,
          changeRequest(context.body),
          env.APP_ORIGIN,
        ),
      ),
    )
    return Response.json(result, {
      status: result.state === 'pending' ? 202 : 200,
    })
  }
  let changeId: string
  try {
    changeId = decodeURIComponent(resultId ?? '')
  } catch {
    throw new HttpError(
      404,
      'workspace_repository_change_unavailable',
      'This repository change is not available.',
    )
  }
  const result = requireFeatureResult(
    await labelRepositoryChangeResult(
      env,
      { id, orgId },
      await object.readWorkspaceRepositoryChange(
        orgId,
        id,
        context.user.id,
        changeId,
        env.APP_ORIGIN,
      ),
    ),
  )
  return request.method === 'HEAD' ? new Response(null) : Response.json(result)
}
