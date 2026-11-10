import type { WorkspaceChat } from '../chat/backend'
import { activeStoredTurn } from '../devices/access'
import type { WorkspaceController } from './workspace-controller-types'
import type { WorkspacePlatform } from './workspace-platform'
import type { DurableLifecycle } from './durable'
import type { AppEnv } from '../env'
import { requireWorkspaceOrg } from './access'
import type { TurnTokenCheck } from '../model-gateway/types'

export async function checkWorkspaceTurnToken(
  chat: WorkspaceChat,
  token: string,
): Promise<TurnTokenCheck> {
  const workspaceId = await chat.store.workspaceId()
  return workspaceId
    ? chat.turnTokens.check(workspaceId, token)
    : { ok: false, reason: 'turn_not_active' }
}

export async function creationCredentialSender(
  env: AppEnv,
  lifecycle: DurableLifecycle,
  platform: WorkspacePlatform,
  turnId: string,
): Promise<string | null> {
  const state = await lifecycle.read()
  if (!state || state.state === 'stopped' || state.state === 'archived')
    return null
  await requireWorkspaceOrg(env.DB, state.orgId, state.workspaceId)
  const job = await platform.storage.get('job', 'lifecycle:start-job')
  return job?.kind === 'create' &&
    (job.phase === 'fetch' || job.phase === 'branch') &&
    !job.cancelled &&
    !job.failure &&
    job.turnId === turnId
    ? job.admission.first.sender.id
    : null
}

export function credentialSender(
  chat: WorkspaceChat,
  controller: WorkspaceController,
  turnId: string,
): Promise<string | null> {
  return chat.runLifecycle(async () => {
    const preparing = await controller.credentialSender(turnId)
    if (preparing) return preparing
    const state = await controller.readLifecycle()
    if (!state || state.state === 'stopped' || state.state === 'archived')
      return null
    return (
      (await activeStoredTurn(chat, state.workspaceId, turnId))?.senderId ??
      null
    )
  })
}
