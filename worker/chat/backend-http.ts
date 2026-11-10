import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { authorizeChatBrowser } from './browser-authorization'
import type { WorkspaceChat } from './backend'
import { chatRoute } from './http-routes'
import type { ChatOperation } from './operation'
import { browserUpgrade, runnerUpgrade } from './sockets'
import type { ChatDependencies } from './types'

export async function fetchWorkspaceChat(
  chat: WorkspaceChat,
  request: Request,
  env: AppEnv,
  dependencies: ChatDependencies,
  operation: (workspaceId: string) => ChatOperation,
  flush: () => Promise<void>,
): Promise<Response> {
  try {
    if (new URL(request.url).pathname === MACHINE_PATHS.runner)
      return await runnerUpgrade(chat, request)
    const access = await chat.authorizeBrowser(request)
    if (access.suffix === '/events')
      return await browserUpgrade(chat, request, access)
    return await chat.store.run(async () => {
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
    })
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
