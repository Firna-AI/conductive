import {
  SECRET_TOOL_PATHS,
  type SecretRequestsResponse,
} from '../../src/shared/secret-requests'
import { machineWorkspace } from '../devices/access'
import { errorResponse, HttpError, privateResponse } from '../http'
import { readJsonObject } from '../http/json-body'
import { readSecretAnswer, readSecretRun } from './request-input'
import type { SecretRuntime } from './runtime'
import { authorizeChatBrowser } from '../chat/browser-authorization'
import { removeWorkspaceValue } from './remove-workspace-value'

export function isSecretMachinePath(path: string) {
  return path === SECRET_TOOL_PATHS.list || path === SECRET_TOOL_PATHS.run
}

export async function fetchSecretRequests(
  runtime: SecretRuntime,
  request: Request,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const machine = isSecretMachinePath(path)
  const app = path.match(/\/secret-requests(?:\/([^/]+)\/answer)?$/)
  const value = path.match(/\/secret-values\/([^/]+)$/)
  if (!machine && !app && !value) return null
  try {
    if (machine) {
      const method = path === SECRET_TOOL_PATHS.list ? 'GET' : 'POST'
      await machineWorkspace(request, runtime.env)
      if (request.method !== method) return methodResponse(method)
      const result =
        method === 'GET'
          ? await runtime.list(request)
          : await runtime.run(
              request,
              readSecretRun(await readJsonObject(request)),
            )
      return privateResponse(Response.json(result))
    }
    const access = await authorizeChatBrowser(
      request,
      runtime.env,
      runtime.now(),
      request.method === 'DELETE' ? {} : undefined,
    )
    const workspaceId = access.workspace.id
    if (!runtime.matches(workspaceId))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    await runtime.reconcile()
    if (app && !app[1] && request.method === 'GET') {
      return privateResponse(
        Response.json({
          requests: (await runtime.records.requests()).map(
            (record) => record.request,
          ),
          workspaceValues: (await runtime.records.temporary(runtime.now()))
            .filter((item) => item.sessionId === null)
            .map(({ id, name, suppliedBy, createdAt }) => ({
              id,
              name,
              suppliedBy,
              createdAt,
            })),
        } satisfies SecretRequestsResponse),
      )
    }
    if (app?.[1] && request.method === 'POST') {
      return privateResponse(
        Response.json({
          request: await runtime.answer(
            workspaceId,
            decodeId(app[1]),
            readSecretAnswer(access.context.body ?? {}),
            {
              id: access.context.user.id,
              githubLogin: access.context.user.githubLogin,
              displayName: access.context.user.displayName,
              avatarUrl: access.context.user.avatarUrl,
            },
          ),
        }),
      )
    }
    if (value && request.method === 'DELETE') {
      if (access.workspace.archivedAt !== null)
        throw new HttpError(
          409,
          'workspace_archived',
          'The archived chat is read-only.',
        )
      await removeWorkspaceValue(
        runtime,
        request,
        access.workspace,
        decodeId(value[1]),
        {
          id: access.context.user.id,
          githubLogin: access.context.user.githubLogin,
          displayName: access.context.user.displayName,
          avatarUrl: access.context.user.avatarUrl,
        },
      )
      return privateResponse(new Response(null, { status: 204 }))
    }
    return methodResponse(value ? 'DELETE' : app?.[1] ? 'POST' : 'GET')
  } catch (error) {
    return privateResponse(errorResponse(error, request))
  }
}

function methodResponse(method: string) {
  return privateResponse(
    Response.json(
      { error: { code: 'method_not_allowed', message: `Use ${method}.` } },
      { status: 405, headers: { Allow: method } },
    ),
  )
}

function decodeId(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new HttpError(400, 'invalid_input', 'The request ID is not valid.')
  }
}
