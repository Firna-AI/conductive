import type { ChatHistoryResponse } from '../../src/shared/events'
import type { AppEnv } from '../env'
import { errorResponse, privateResponse } from '../http'
import { gate } from '../security/gate'
import type { WorkspaceController } from './workspace-controller-types'

/** A removed failed create exposes its retained public history only to its sender. */
export async function failedCreationEvents(
  request: Request,
  env: AppEnv,
  controller: WorkspaceController,
  matchesObject: (workspaceId: string) => boolean,
  history: (workspaceId: string, after: number) => Promise<ChatHistoryResponse>,
): Promise<Response | null> {
  const url = new URL(request.url)
  const match = url.pathname.match(
    /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/events$/u,
  )
  if (
    !match ||
    request.method !== 'GET' ||
    request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
  )
    return null
  try {
    const context = await gate(request, env, Date.now())
    if (!context.org) return null
    const workspaceId = decodeURIComponent(match[1])
    if (!matchesObject(workspaceId)) return null
    const draft = await controller.failedLifecycleCreation(
      context.org.id,
      context.user.id,
    )
    if (!draft || draft.workspaceId !== workspaceId) return null
    const after = Number(url.searchParams.get('after') ?? '0')
    const retained = await history(
      workspaceId,
      Number.isSafeInteger(after) && after >= 0 ? after : 0,
    )
    const pair = new WebSocketPair()
    pair[1].accept()
    pair[1].send(JSON.stringify({ type: 'history', history: retained }))
    pair[1].close(1000, 'Connection closed.')
    return new Response(null, { status: 101, webSocket: pair[0] })
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
