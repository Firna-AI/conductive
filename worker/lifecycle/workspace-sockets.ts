import {
  workspaceEventsPath,
  type WorkspaceEventEnvelope,
  type WorkspaceSocketMessage,
} from '../../src/shared/events'
import type { AppEnv } from '../env'
import { findMembership } from '../data/orgs'
import { HttpError, isRecord, errorResponse, privateResponse } from '../http'
import type { DurableLifecycle } from './durable'
import { gate } from '../security/gate'
import type { DurableLifecycleState } from './durable-types'
import type { WorkspaceEventJournal } from './durable-journal'

interface TabIdentity {
  userId: string
  orgId: string
}

export async function handleWorkspaceSocket(
  request: Request,
  env: AppEnv,
  ctx: DurableObjectState,
  lifecycle: DurableLifecycle,
  journal: WorkspaceEventJournal,
): Promise<Response> {
  try {
    return await openWorkspaceEventSocket({
      request,
      env,
      ctx,
      state: await lifecycle.read(),
      journal,
    })
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}

function tabIdentity(socket: WebSocket): TabIdentity | null {
  const value: unknown = socket.deserializeAttachment()
  if (
    !isRecord(value) ||
    typeof value.userId !== 'string' ||
    typeof value.orgId !== 'string'
  )
    return null
  return { userId: value.userId, orgId: value.orgId }
}

/** The concurrency block sends history before it permits a live publish. */
export async function attachWorkspaceSubscription(
  ctx: DurableObjectState,
  journal: WorkspaceEventJournal,
  socket: WebSocket,
  after: number,
): Promise<void> {
  await ctx.blockConcurrencyWhile(async () => {
    await journal.subscribe(after, (history) => {
      ctx.acceptWebSocket(socket, ['workspace'])
      socket.send(
        JSON.stringify({
          type: 'history',
          history,
        } satisfies WorkspaceSocketMessage),
      )
    })
  })
}

export async function openWorkspaceEventSocket(input: {
  request: Request
  env: AppEnv
  ctx: DurableObjectState
  state: DurableLifecycleState | undefined
  journal: WorkspaceEventJournal
}): Promise<Response> {
  const context = await gate(input.request, input.env, Date.now())
  const state = input.state
  if (
    !state ||
    context.org?.id !== state.orgId ||
    new URL(input.request.url).pathname !==
      new URL(
        workspaceEventsPath(state.orgId, state.workspaceId),
        input.env.APP_ORIGIN,
      ).pathname
  )
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  if (input.request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
    throw new HttpError(
      426,
      'socket_required',
      'Open a workspace connection to continue.',
    )
  const pair = new WebSocketPair()
  const [client, server] = Object.values(pair)
  server.serializeAttachment({
    userId: context.user.id,
    orgId: state.orgId,
  } satisfies TabIdentity)
  const after = Number(
    new URL(input.request.url).searchParams.get('after') ?? '0',
  )
  await attachWorkspaceSubscription(
    input.ctx,
    input.journal,
    server,
    Number.isSafeInteger(after) && after >= 0 ? after : 0,
  )
  return new Response(null, { status: 101, webSocket: client })
}

export async function broadcastWorkspaceEvent(
  env: AppEnv,
  ctx: DurableObjectState,
  envelope: WorkspaceEventEnvelope,
): Promise<void> {
  for (const socket of ctx.getWebSockets('workspace')) {
    const tab = tabIdentity(socket)
    if (!tab || !(await findMembership(env.DB, tab.orgId, tab.userId))) {
      socket.close(1008, 'The org is not available.')
      continue
    }
    try {
      socket.send(
        JSON.stringify({
          type: 'event',
          envelope,
        } satisfies WorkspaceSocketMessage),
      )
    } catch {
      socket.close(1011, 'The connection closed.')
    }
  }
}
