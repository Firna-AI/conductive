import { HttpError } from '../http'
import type { AgentToolServices } from './services'
import { memberSender, type CallingWorkspace } from './store'

export async function requireCallingToolTurn(
  db: D1Database,
  caller: CallingWorkspace,
  turnId: string | null,
  services: AgentToolServices,
) {
  const turn = turnId
    ? await services.callingTurn(caller.workspaceId, turnId)
    : null
  if (
    !turn ||
    turn.workspaceId !== caller.workspaceId ||
    turn.turnId !== turnId ||
    !turn.sessionId
  ) {
    throw new HttpError(
      403,
      'calling_turn_required',
      'Start this request from an active agent turn.',
    )
  }
  const sender = await memberSender(db, caller.orgId, turn.senderUserId)
  if (!sender)
    throw new HttpError(
      403,
      'membership_required',
      'The workspace needs a current org member.',
    )
  return { turn, sender }
}
