import type { AgentScheduleWakeUpRequest } from '../../src/shared/generated/AgentScheduleWakeUpRequest'
import { MACHINE_PATHS, TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import { invalidInput } from '../chat/inputs'
import { HttpError } from '../http'
import { readJsonObject } from '../http/json-body'
import { requireCallingToolTurn } from './calling-turn'
import type { AgentToolServices } from './services'
import { messageText } from './session-input'
import type { CallingWorkspace } from './store'

const SESSION_ROUTE = new RegExp(
  `^${MACHINE_PATHS.workspaces}/([^/]+)/sessions/([^/]+)/wake-ups(?:/([^/]+)/cancel)?$`,
)

export function wakeUpToolMethods(path: string): string[] | null {
  if (path === MACHINE_PATHS.wakeUps) return ['POST']
  const match = path.match(SESSION_ROUTE)
  return match ? [match[3] === undefined ? 'GET' : 'POST'] : null
}

function input(fields: Record<string, unknown>): AgentScheduleWakeUpRequest {
  const text = messageText(fields.text)
  const { at, delaySeconds } = fields
  if (
    delaySeconds === undefined &&
    typeof at === 'number' &&
    Number.isSafeInteger(at)
  )
    return { text, at }
  if (
    at === undefined &&
    typeof delaySeconds === 'number' &&
    Number.isFinite(delaySeconds)
  )
    return { text, delaySeconds }
  return invalidInput()
}

function decode(
  id: string,
  code: 'workspace_not_found' | 'session_not_found' | 'wake_up_not_found',
) {
  try {
    return decodeURIComponent(id)
  } catch {
    throw new HttpError(404, code, 'The requested item is not available.')
  }
}

export async function wakeUpFromTool(
  request: Request,
  url: URL,
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
): Promise<Response | null> {
  if (url.pathname === MACHINE_PATHS.wakeUps) {
    const { turn } = await requireCallingToolTurn(
      db,
      caller,
      request.headers.get(TOOL_TURN_HEADER),
      services,
    )
    return Response.json(
      await services.scheduleWakeUp(
        caller.orgId,
        caller.workspaceId,
        turn.turnId,
        input(await readJsonObject(request)),
      ),
    )
  }
  const match = url.pathname.match(SESSION_ROUTE)
  if (!match) return null
  const workspaceId =
    match[1] === 'current'
      ? caller.workspaceId
      : decode(match[1], 'workspace_not_found')
  const sessionId = decode(match[2], 'session_not_found')
  if (match[3] === undefined)
    return Response.json(
      await services.listWakeUps(caller.orgId, workspaceId, sessionId),
    )
  const { turn } = await requireCallingToolTurn(
    db,
    caller,
    request.headers.get(TOOL_TURN_HEADER),
    services,
  )
  return Response.json(
    await services.cancelWakeUp({
      orgId: caller.orgId,
      workspaceId,
      sessionId,
      wakeUpId: decode(match[3], 'wake_up_not_found'),
      callerWorkspaceId: caller.workspaceId,
      callerSessionId: turn.sessionId,
      senderUserId: turn.senderUserId,
    }),
  )
}
