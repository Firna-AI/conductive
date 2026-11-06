import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireOrgMember, requireWorkspaceOrg } from './access'
import type { DurableLifecycle } from './durable'
import type { TurnScopes } from './turns'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { WorkspaceStartJob } from './start-types'

export async function initializeWorkspaceLifecycle(
  ctx: DurableObjectState,
  env: AppEnv,
  lifecycle: DurableLifecycle,
  turns: TurnScopes,
  input: Parameters<WorkspaceLifecycleEndpoint['initializeLifecycle']>[0],
): Promise<void> {
  await ctx.blockConcurrencyWhile(async () => {
    if (
      (await ctx.storage.get<WorkspaceStartJob>('lifecycle:start-job'))
        ?.cancelled
    )
      return
    if (await ctx.storage.get('org-image:coordinator'))
      throw new HttpError(
        409,
        'coordinator_conflict',
        'The workspace could not start. Try again.',
      )
    await requireWorkspaceOrg(env.DB, input.orgId, input.workspaceId)
    await requireOrgMember(env.DB, input.orgId, input.firstTurn.senderUserId)
    await turns.register(input.firstTurn)
    await lifecycle.initialize(input)
  })
}
