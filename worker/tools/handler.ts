import {
  MACHINE_PATHS,
  type AgentCreateWorkspaceRequest,
} from '../../src/shared/agent-tools'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { createWorkspaceInput, ToolInputError } from '../../tools/input'
import { createdWorkspace } from '../../tools/responses'
import { errorResponse, HttpError, privateResponse } from '../http'
import { readJsonObject } from '../http/json-body'
import { createFromTool } from './create'
import { isAgentToolPath, listFromTool } from './lists'
import type { AgentToolServices } from './services'
import { callingWorkspace } from './store'

export interface AgentToolsEnvironment {
  DB: D1Database
  MACHINE_ORIGIN: string
}

/** Mount only on the machine surface. This handler authorizes no other route. */
export function createAgentToolsHandler(
  env: AgentToolsEnvironment,
  services: AgentToolServices,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url)
      if (url.origin !== env.MACHINE_ORIGIN || !isAgentToolPath(url.pathname)) {
        throw new HttpError(404, 'not_found', 'The page is not available.')
      }
      const methods =
        url.pathname === MACHINE_PATHS.workspaces ? ['GET', 'POST'] : ['GET']
      const allow = methods.join(', ')
      if (!methods.includes(request.method) || request.headers.has('Upgrade')) {
        return privateResponse(
          Response.json(
            {
              error: {
                code: 'method_not_allowed',
                message: methods.length === 1 ? 'Use GET.' : 'Use GET or POST.',
              },
            },
            { status: 405, headers: { Allow: allow } },
          ),
        )
      }
      const authorization = request.headers.get('Authorization')
      const bearer = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1]
      const caller = bearer ? await callingWorkspace(env.DB, bearer) : null
      if (!caller) {
        throw new HttpError(
          401,
          'workspace_token_invalid',
          'The workspace login is not valid. Start the workspace again.',
        )
      }
      if (request.method === 'GET') {
        return privateResponse(
          Response.json(
            await listFromTool(url.pathname, env.DB, caller, services),
          ),
        )
      }
      let input: AgentCreateWorkspaceRequest
      try {
        input = createWorkspaceInput(await readJsonObject(request))
      } catch (error) {
        if (error instanceof HttpError && error.code === 'json_required')
          throw error
        throw new HttpError(
          400,
          'invalid_input',
          error instanceof ToolInputError
            ? error.message
            : 'Send valid JSON for the workspace request.',
        )
      }
      const result = await createFromTool(
        env.DB,
        caller,
        request.headers.get(TOOL_TURN_HEADER),
        input,
        services,
      )
      return privateResponse(
        Response.json(createdWorkspace(result), { status: 201 }),
      )
    } catch (error) {
      return privateResponse(errorResponse(error))
    }
  }
}
