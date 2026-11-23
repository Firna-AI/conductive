import { workspaceBinding } from '../app-api/workspace-state'
import type { AppEnv } from '../env'
import { requireFeatureResult } from '../features/result'
import type { GitHubWorkspace } from '../github/contracts'
import type { WebhookRoute } from '../github/webhook-routing'
import { queueId, type QueueLeave, type QueueScope } from './contracts'
import {
  queueScopesForOrg,
  scopeForQueueWorkspace,
  scopesWithQueuer,
} from './data'
import { queueScopesForRepository } from './step-data'

type WorkspaceLeave = Extract<QueueLeave, { workspaceId: string }>

export function queueObject(env: AppEnv, scope: QueueScope) {
  return workspaceBinding(env).getByName(queueId(scope), {
    locationHint: 'weur',
  })
}

async function wakeQueue(
  env: AppEnv,
  scope: QueueScope,
  leave?: QueueLeave,
): Promise<void> {
  requireFeatureResult(
    await queueObject(env, scope).wakeMergeQueue(scope, leave),
  )
}

export async function leaveWorkspaceQueue(
  env: AppEnv,
  workspace: Pick<GitHubWorkspace, 'id' | 'orgId' | 'branch'>,
  cause: WorkspaceLeave['cause'],
  options: { pullNumber?: number; actorId?: string } = {},
): Promise<void> {
  const scope = await scopeForQueueWorkspace(env.DB, workspace)
  if (scope)
    await wakeQueue(env, scope, {
      cause,
      workspaceId: workspace.id,
      branch: workspace.branch,
      ...options,
    })
}

export async function wakeRepositoryQueues(
  env: AppEnv,
  repositoryId: number,
  installationId: number,
) {
  for (const scope of await queueScopesForRepository(
    env.DB,
    repositoryId,
    installationId,
  ))
    await wakeQueue(env, scope)
}

export async function wakeQueueWebhook(env: AppEnv, route: WebhookRoute) {
  await wakeRepositoryQueues(env, route.repositoryId, route.installationId)
}

export async function leaveOrgQueues(env: AppEnv, orgId: string) {
  for (const scope of await queueScopesForOrg(env.DB, orgId))
    await wakeQueue(env, scope, { cause: 'org-suspended' })
}

export async function wakeQueuerQueues(
  env: AppEnv,
  orgId: string,
  userId: string,
) {
  for (const scope of await scopesWithQueuer(env.DB, orgId, userId))
    await wakeQueue(env, scope)
}
