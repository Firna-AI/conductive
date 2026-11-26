import type { ServiceCatalogue } from '../../src/shared/generated/ServiceCatalogue'
import type { ServiceControlResult } from '../../src/shared/generated/ServiceControlResult'
import type { ServiceLogResponse } from '../../src/shared/generated/ServiceLogResponse'
import {
  ServiceInputError,
  readServiceControlRequest,
  readServiceLogRequest,
} from '../../src/shared/service-inputs'
import { servicePaths } from '../../src/shared/services'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { readJsonObject } from '../http/json-body'
import { requireRunning, workspaceTarget } from '../previews/access'
import { sessionGate } from '../security/gate'
import { sameComputer } from './binding'
import type { WorkspaceServices } from './runtime'
import { requireServiceControlAccess } from './access'

/** Reads need workspace membership. Controls also use the header Restart gates. */
export function createServicesHandler(
  env: AppEnv,
  services: WorkspaceServices,
  now: () => number,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const path = new URL(request.url).pathname
      const match = path.match(
        /^\/api\/orgs\/([^/]+)\/workspaces\/([^/]+)\/services(?:\/(?:control|logs))?$/,
      )
      if (!match)
        throw new HttpError(404, 'not_found', 'The page is not available.')
      let orgId: string
      let workspaceId: string
      try {
        orgId = decodeURIComponent(match[1])
        workspaceId = decodeURIComponent(match[2])
      } catch {
        throw new HttpError(
          404,
          'workspace_not_found',
          'The workspace is not available.',
        )
      }
      const context = await sessionGate(request, env, now())
      const target = await workspaceTarget(
        env,
        orgId,
        workspaceId,
        context.user.id,
      )
      const control = path === servicePaths.control(orgId, workspaceId)
      const authorize = async () => {
        const currentContext = await sessionGate(request, env, now())
        const current = await workspaceTarget(
          env,
          orgId,
          workspaceId,
          currentContext.user.id,
        )
        if (!sameComputer(current, target))
          throw new HttpError(
            404,
            'workspace_not_found',
            'The workspace is not available.',
          )
        if (control) requireRunning(current)
      }
      let body: ServiceCatalogue | ServiceControlResult | ServiceLogResponse
      if (
        path === servicePaths.catalogue(orgId, workspaceId) &&
        request.method === 'GET'
      ) {
        body = await services.catalogue(target)
        await authorize()
      } else if (
        request.method === 'POST' &&
        (control || path === servicePaths.logs(orgId, workspaceId))
      ) {
        if (control) {
          requireRunning(target)
          await requireServiceControlAccess(env, target, context.user.id)
        }
        const input = await readJsonObject(request)
        await authorize()
        try {
          if (control) {
            const parsed = readServiceControlRequest(input)
            body = await services.control(target, parsed, authorize)
          } else {
            const parsed = readServiceLogRequest(input)
            body = await services.readLogs(target, parsed, authorize)
          }
        } catch (error) {
          if (!(error instanceof ServiceInputError)) throw error
          throw new HttpError(
            400,
            'invalid_input',
            'Check the message and try again.',
          )
        }
        const currentContext = await sessionGate(request, env, now())
        await workspaceTarget(env, orgId, workspaceId, currentContext.user.id)
      } else throw new HttpError(404, 'not_found', 'The page is not available.')
      return privateResponse(Response.json(body))
    } catch (error) {
      return privateResponse(errorResponse(error, request))
    }
  }
}
