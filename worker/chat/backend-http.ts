import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import { errorResponse, privateResponse } from '../http'
import type { WorkspaceChat } from './backend'
import { browserRequest } from './browser-request'
import type { ChatOperation } from './operation'
import { browserUpgrade, runnerUpgrade } from './sockets'
import type { ChatDependencies, ChatStorage } from './types'

export async function fetchWorkspaceChat(
  chat: WorkspaceChat,
  request: Request,
  env: AppEnv,
  dependencies: ChatDependencies,
  operation: (workspaceId: string) => ChatOperation,
  flush: () => Promise<void>,
  storage: ChatStorage,
): Promise<Response> {
  try {
    if (new URL(request.url).pathname === MACHINE_PATHS.runner)
      return await runnerUpgrade(chat, request)
    const access = await chat.authorizeBrowser(request)
    if (access.suffix === '/events')
      return await browserUpgrade(chat, request, access)
    return await browserRequest(
      request,
      access,
      chat.store,
      storage,
      env,
      dependencies,
      operation(access.workspace.id),
      flush,
    )
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
