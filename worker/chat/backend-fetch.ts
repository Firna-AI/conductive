import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import { errorResponse, privateResponse } from '../http'
import type { WorkspaceChat } from './backend'
import { browserRequest } from './browser-request'
import type { ChatOperation } from './operation'
import { browserUpgrade, runnerUpgrade } from './sockets'
import type { ChatStore } from './store'
import type { ChatDependencies, ChatStorage } from './types'

export async function fetchWorkspaceChat(
  request: Request,
  context: {
    chat: WorkspaceChat
    store: ChatStore
    storage: ChatStorage
    env: AppEnv
    dependencies: ChatDependencies
    operation(workspaceId: string): ChatOperation
  },
): Promise<Response> {
  const { chat, store, storage, env, dependencies } = context
  try {
    if (new URL(request.url).pathname === MACHINE_PATHS.runner)
      return await runnerUpgrade(chat, request)
    const access = await chat.authorizeBrowser(request)
    if (access.suffix === '/events')
      return await browserUpgrade(chat, request, access)
    return await browserRequest(
      request,
      access,
      store,
      storage,
      env,
      dependencies,
      context.operation(access.workspace.id),
      () => chat.flushRunner(),
    )
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
