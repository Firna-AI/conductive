import type { AppEnv } from '../env'
import { requireWorkspaceOrg } from './access'
import type { DurableLifecycle } from './durable'
import { START_JOB_KEY } from './start-storage'
import type { WorkspacePlatform } from './workspace-platform'

/**
 * The sender whose GitHub token a trusted fetch of the lifecycle gets: the
 * workspace owner during a saved base-move fetch, or the sender of the
 * admitted first message while a create prepares its repository. Otherwise
 * null, and `credentialSender` in `credential-sender.ts` asks the chat.
 */
export async function preparingCredentialSender(
  env: Pick<AppEnv, 'DB'>,
  platform: Pick<WorkspacePlatform, 'storage' | 'baseChanges'>,
  lifecycle: Pick<DurableLifecycle, 'read'>,
  turnId: string,
): Promise<string | null> {
  const baseSender = await platform.baseChanges?.credentialSender(turnId)
  if (baseSender !== undefined) return baseSender
  const state = await lifecycle.read()
  if (!state || state.state === 'stopped' || state.state === 'archived')
    return null
  await requireWorkspaceOrg(env.DB, state.orgId, state.workspaceId)
  const job = await platform.storage.get('job', START_JOB_KEY)
  return job?.kind === 'create' &&
    (job.phase === 'fetch' || job.phase === 'branch') &&
    !job.cancelled &&
    !job.failure &&
    job.turnId === turnId
    ? job.admission.first.sender.id
    : null
}
