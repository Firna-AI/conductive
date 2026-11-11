import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import {
  authorizeChatBrowser,
  type BrowserAccess,
} from './browser-authorization'
import { chatRoute } from './http-routes'
import type { ChatOperation } from './operation'
import { sessionTranscript } from './session-transcript'
import type { ChatStore } from './store'
import type { ChatDependencies, ChatStorage } from './types'

/** Transcript reads yield the queue after their snapshot and each page. */
export async function browserRequest(
  request: Request,
  access: BrowserAccess,
  store: ChatStore,
  storage: ChatStorage,
  env: AppEnv,
  dependencies: ChatDependencies,
  operation: ChatOperation,
  flushRunner: () => Promise<void>,
): Promise<Response> {
  const transcript = await sessionTranscript(
    request,
    access,
    store,
    storage,
    env,
  )
  if (transcript) return privateResponse(transcript)
  return store.run(async () => {
    const write = request.method !== 'GET' && request.method !== 'HEAD'
    const current = write
      ? await authorizeChatBrowser(
          request,
          env,
          dependencies.now(),
          access.context.body,
        )
      : access
    if (write && current.workspace.archivedAt !== null) {
      throw new HttpError(
        409,
        'workspace_archived',
        'The archived chat is read-only.',
      )
    }
    const response = await chatRoute(
      request,
      current.suffix,
      current.context,
      operation,
      dependencies,
      access.presentation,
    )
    if (write) await flushRunner()
    return privateResponse(response)
  })
}
