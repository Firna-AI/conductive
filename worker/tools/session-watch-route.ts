import { TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import type { AgentToolServices } from './services'
import type { CallingWorkspace } from './store'
import { memberSender } from './store'
import { HttpError } from '../http'
import { readJsonObject } from '../http/json-body'
import { identifier } from '../chat/inputs'

export async function watchSessionFromTool(
  request: Request,
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
  workspaceId: string,
  sessionId: string,
) {
  const turnId = request.headers.get(TOOL_TURN_HEADER)
  const turn = turnId
    ? await services.callingWatchTurn(caller.workspaceId, turnId)
    : null
  if (
    !turn ||
    turn.workspaceId !== caller.workspaceId ||
    turn.turnId !== turnId ||
    !turn.sessionId
  )
    throw new HttpError(
      403,
      'calling_turn_required',
      'Start this request from an active agent turn.',
    )
  if (!(await memberSender(db, caller.orgId, turn.senderUserId)))
    throw new HttpError(
      403,
      'membership_required',
      'The workspace needs a current org member.',
    )
  const body = await readJsonObject(request)
  return Response.json(
    await services.watchSession({
      orgId: caller.orgId,
      workspaceId,
      sessionId,
      caller: turn,
      ...(body.turnId !== undefined && { turnId: identifier(body.turnId) }),
    }),
  )
}
