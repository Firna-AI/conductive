import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import {
  authorizeChatBrowser,
  type BrowserAccess,
} from './browser-authorization'
import { chatRoute } from './http-routes'
import type { ChatOperation } from './operation'
import type { ChatDependencies } from './types'

/** The caller holds the chat queue. Writes check current access before any change. */
export async function browserRouteResponse(
  request: Request,
  access: BrowserAccess,
  env: AppEnv,
  dependencies: ChatDependencies,
  operation: (id: string) => ChatOperation,
  flush: () => Promise<void>,
): Promise<Response> {
  const write = request.method !== 'GET' && request.method !== 'HEAD'
  const current = write
    ? await authorizeChatBrowser(
        request,
        env,
        dependencies.now(),
        access.context.body,
      )
    : access
  if (write && current.workspace.archivedAt !== null)
    throw new HttpError(
      409,
      'workspace_archived',
      'The archived chat is read-only.',
    )
  const response = await chatRoute(
    request,
    current.suffix,
    current.context,
    operation(current.workspace.id),
    dependencies,
    access.presentation,
  )
  if (write) await flush()
  return privateResponse(response)
}
