import type { ServiceCatalogue } from '../../shared/generated/ServiceCatalogue'
import type { ServiceControlRequest } from '../../shared/generated/ServiceControlRequest'
import type { ServiceControlResult } from '../../shared/generated/ServiceControlResult'
import type { ServiceLogRequest } from '../../shared/generated/ServiceLogRequest'
import type { ServiceLogResponse } from '../../shared/generated/ServiceLogResponse'
import { ServiceInputError } from '../../shared/service-inputs'
import { servicePaths } from '../../shared/services'
import { requestJson, type ToolResult } from '../../terminal/tool-parts/request'
import type { ToolRequests } from '../../terminal/tool-parts/workspace'
import {
  readServiceCatalogue,
  readServiceControlResult,
  readServiceLogResponse,
} from './serviceReplies'

/** A reader that gives null for a body that it refuses, as `requestJson` needs. */
function orNull<T>(read: (body: unknown) => T): (body: unknown) => T | null {
  return (body) => {
    try {
      return read(body)
    } catch (error) {
      if (error instanceof ServiceInputError) return null
      throw error
    }
  }
}

/**
 * Reads the services of the workspace, with no answer from the cache of the
 * browser. A Worker without services answers its unknown route with
 * `not_found`, so that answer reads as software without services. Every
 * other refusal, such as `workspace_not_found`, stays an error.
 */
export async function getServiceCatalogue(
  workspace: ToolRequests,
  signal: AbortSignal,
): Promise<ToolResult<ServiceCatalogue>> {
  const path = servicePaths.catalogue(workspace.orgId, workspace.workspaceId)
  const result = await requestJson(
    workspace.fetch,
    { method: 'GET', path, signal, cache: 'no-store' },
    orNull(readServiceCatalogue),
  )
  if (!result.ok && result.error.code === 'not_found')
    return { ok: true, value: { state: 'unsupported' } }
  return result
}

/**
 * Sends one Stop or Restart. It takes no signal, so a control that the user
 * sent reaches the server, also after its view closes.
 */
export function sendServiceControl(
  workspace: ToolRequests,
  request: ServiceControlRequest,
): Promise<ToolResult<ServiceControlResult>> {
  const path = servicePaths.control(workspace.orgId, workspace.workspaceId)
  return requestJson(
    workspace.fetch,
    { method: 'POST', path, body: request },
    orNull(readServiceControlResult),
  )
}

/** Reads the end of the log of one run of a service. */
export function readServiceLog(
  workspace: ToolRequests,
  request: ServiceLogRequest,
  signal: AbortSignal,
): Promise<ToolResult<ServiceLogResponse>> {
  const path = servicePaths.logs(workspace.orgId, workspace.workspaceId)
  return requestJson(
    workspace.fetch,
    { method: 'POST', path, body: request, signal },
    orNull(readServiceLogResponse),
  )
}
