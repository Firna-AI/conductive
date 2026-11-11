import {
  MACHINE_PATHS,
  type AgentReadSessionRequest,
} from '../../src/shared/agent-tools'
import { HttpError } from '../http'
import { counter, invalidInput } from '../chat/inputs'
import type { AgentToolServices } from './services'
import type { CallingWorkspace } from './store'
import { toolSessionWorkspace } from './session-access'
import { readJsonObject } from '../http/json-body'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { requireCallingToolTurn } from './calling-turn'
import { createSessionInput, sendSessionInput } from './session-input'

const SESSION_ROUTE = new RegExp(
  `^${MACHINE_PATHS.workspaces}/([^/]+)/sessions(?:/([^/]+)/(transcript|messages))?$`,
)

export function isAgentSessionPath(path: string): boolean {
  return SESSION_ROUTE.test(path)
}

export function sessionToolMethods(path: string): string[] | null {
  const match = path.match(SESSION_ROUTE)
  return !match
    ? null
    : match[3] === 'messages'
      ? ['POST']
      : match[3] === 'transcript'
        ? ['GET']
        : ['GET', 'POST']
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
}

function readOptions(query: URLSearchParams): AgentReadSessionRequest {
  const detail = query.get('detail') ?? 'concise'
  if (detail !== 'concise' && detail !== 'full') return invalidInput()
  const start = query.get('startLine')
  const offset = query.get('startOffset')
  return {
    detail,
    ...(start !== null && { startLine: Math.max(1, counter(Number(start))) }),
    ...(offset !== null && { startOffset: counter(Number(offset)) }),
  }
}

export async function readSessionsFromTool(
  url: URL,
  db: D1Database,
  caller: CallingWorkspace,
  origin: string,
  services: AgentToolServices,
) {
  const match = url.pathname.match(SESSION_ROUTE)
  if (!match || match[3] === 'messages') return null
  const workspaceId =
    match[1] === 'current' ? caller.workspaceId : decode(match[1])
  await toolSessionWorkspace(db, caller.orgId, workspaceId, origin)
  return match[2] === undefined
    ? services.listSessions(caller.orgId, workspaceId)
    : services.readSession(
        caller.orgId,
        workspaceId,
        decode(match[2]),
        readOptions(url.searchParams),
      )
}

export async function writeSessionsFromTool(
  request: Request,
  url: URL,
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
) {
  const match = url.pathname.match(SESSION_ROUTE)
  if (!match || match[3] === 'transcript') return null
  const { turn } = await requireCallingToolTurn(
    db,
    caller,
    request.headers.get(TOOL_TURN_HEADER),
    services,
  )
  const body = await readJsonObject(request)
  const workspaceId =
    match[1] === 'current' ? caller.workspaceId : decode(match[1])
  const operation =
    match[3] === 'messages'
      ? {
          kind: 'send' as const,
          sessionId: decode(match[2]),
          input: sendSessionInput(body),
        }
      : { kind: 'create' as const, input: createSessionInput(body) }
  const result = await services.writeSession({
    ...operation,
    orgId: caller.orgId,
    workspaceId,
    callerWorkspaceId: caller.workspaceId,
    callerSessionId: turn.sessionId,
    senderUserId: turn.senderUserId,
    requestId: operation.input.requestId ?? crypto.randomUUID(),
  })
  return Response.json(result, {
    status: operation.kind === 'create' ? 201 : 202,
  })
}
