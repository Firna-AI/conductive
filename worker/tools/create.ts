import type { AgentCreateWorkspaceRequest } from '../../src/shared/agent-tools'
import { sessionTitleFrom } from '../../src/shared/session-title'
import { choice } from '../../tools/input'
import { HttpError } from '../http'
import type { AgentToolServices } from './services'
import {
  type CallingWorkspace,
  creationSection,
  memberSender,
  ownerPreference,
  requireRepository,
} from './store'

export async function createFromTool(
  db: D1Database,
  caller: CallingWorkspace,
  turnId: string | null,
  input: AgentCreateWorkspaceRequest,
  services: AgentToolServices,
) {
  const turn = turnId
    ? await services.callingTurn(caller.workspaceId, turnId)
    : null
  if (
    !turn ||
    turn.workspaceId !== caller.workspaceId ||
    turn.turnId !== turnId
  ) {
    throw new HttpError(
      403,
      'calling_turn_required',
      'Start this request from an active agent turn.',
    )
  }
  const sender = await memberSender(db, caller.orgId, turn.senderUserId)
  const owner = await memberSender(db, caller.orgId, caller.ownerUserId)
  if (!sender || !owner) {
    throw new HttpError(
      403,
      'membership_required',
      'The workspace needs a current org member.',
    )
  }
  await requireRepository(db, caller.orgId, input.repositoryId)
  const sectionId = await creationSection(db, caller.orgId, input.sectionId)
  const defaults =
    input.model && input.effort !== undefined
      ? null
      : ((await ownerPreference(db, caller.ownerUserId)) ??
        (await services.ownerDefaultChoice?.(caller.ownerUserId)))
  const model = input.model ?? defaults
  const effort = input.effort ?? defaults?.effort
  if (!model || effort === undefined) {
    throw new HttpError(
      503,
      'owner_defaults_unavailable',
      'The default model is not available. Choose a model and effort.',
    )
  }
  const name = input.name === undefined ? null : sessionTitleFrom(input.name)
  return services.createWorkspace({
    orgId: caller.orgId,
    owner,
    repositoryId: input.repositoryId,
    sectionId,
    choice: choice({ ...model, effort }),
    firstMessage: input.firstMessage,
    ...(name !== null && { name }),
    sender,
    createdByWorkspaceId: caller.workspaceId,
  })
}
