import type { WorkspacePlatform } from './workspace-platform'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireOrgMember, requireWorkspaceOrg } from './access'
import type { DurableLifecycle } from './durable'
import type { TurnScopes } from './turns'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

export async function initializeWorkspaceLifecycle(
  ctx: WorkspacePlatform,
  env: AppEnv,
  lifecycle: DurableLifecycle,
  turns: TurnScopes,
  input: Parameters<WorkspaceLifecycleEndpoint['initializeLifecycle']>[0],
): Promise<void> {
  await requireWorkspaceOrg(env.DB, input.orgId, input.workspaceId)
  await requireOrgMember(env.DB, input.orgId, input.firstTurn.senderUserId)
  await ctx.blockConcurrencyWhile(async () => {
    if ((await ctx.storage.get('job', 'lifecycle:start-job'))?.cancelled) return
    if (await ctx.storage.get('image', 'org-image:coordinator'))
      throw new HttpError(
        409,
        'coordinator_conflict',
        'The workspace could not start. Try again.',
      )
    await ctx.admitFirstMessage?.(input)
    if (await lifecycle.read()) return
    await turns.register(input.firstTurn)
    await lifecycle.initialize(input)
  })
}
