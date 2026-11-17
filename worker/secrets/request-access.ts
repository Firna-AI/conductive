import type { AppEnv } from '../env'
import type { WorkspaceChat } from '../chat/backend'
import { activeStoredTurn, machineWorkspace } from '../devices/access'
import { memberSender } from '../tools/store'
import { HttpError } from '../http'
import { TOOL_TURN_HEADER } from '../../src/shared/agent-tools'

export async function secretRunAccess(
  env: AppEnv,
  chat: WorkspaceChat,
  request: Request,
  matches: (id: string) => boolean,
) {
  const workspace = await machineWorkspace(request, env)
  if (!matches(workspace.id))
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  const turnId = request.headers.get(TOOL_TURN_HEADER)
  const turn = turnId
    ? await activeStoredTurn(chat, workspace.id, turnId)
    : null
  if (!turn)
    throw new HttpError(
      403,
      'calling_turn_required',
      'Start this request from an active agent turn.',
    )
  const sender = await memberSender(env.DB, workspace.orgId, turn.senderId)
  if (!sender)
    throw new HttpError(
      403,
      'membership_required',
      'The workspace needs a current org member.',
    )
  return { workspace, turn, sender }
}
