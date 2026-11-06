import { providerState } from './provider-state'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { lifecycleProvider } from './lifecycle-provider'
import { readWorkspace, revokeWorkspacePreviews } from './workspace-data'
import { firstOrgAdmin } from './settings-data'
import type { DurableLifecycle } from './durable'

export interface WorkspaceActionContext {
  env: AppEnv
  dependencies: AppDependencies
  orgId: string
  workspaceId: string
}

export async function workspaceActionContext(
  env: AppEnv,
  dependencies: AppDependencies,
  lifecycle: DurableLifecycle,
): Promise<WorkspaceActionContext> {
  const state = await lifecycle.read()
  if (!state)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return {
    env,
    dependencies,
    orgId: state.orgId,
    workspaceId: state.workspaceId,
  }
}

export async function actionResources(context: WorkspaceActionContext) {
  const row = await readWorkspace(
    context.env.DB,
    context.orgId,
    context.workspaceId,
  )
  if (!row.sandboxId)
    throw new HttpError(
      409,
      'sandbox_unavailable',
      'The cloud computer is not available. Try again.',
    )
  const admin = await firstOrgAdmin(context.env.DB, context.orgId)
  if (!admin)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  const provider = await lifecycleProvider(
    context.env,
    admin.userId,
    context.orgId,
    context.dependencies.fetch,
  )
  return { row, provider, sandboxId: row.sandboxId }
}

export async function stopWorkspaceSandbox(
  context: WorkspaceActionContext,
): Promise<void> {
  const { provider, sandboxId } = await actionResources(context)
  await provider.stop(sandboxId)
  await revokeWorkspacePreviews(
    context.env.DB,
    context.workspaceId,
    context.dependencies.now(),
  )
}

export async function extendWorkspaceDeadline(
  context: WorkspaceActionContext,
): Promise<void> {
  const { provider, sandboxId } = await actionResources(context)
  await provider.setAutoStop(sandboxId, 1_800)
}

export async function reconcileWorkspaceSandbox(
  context: WorkspaceActionContext,
): Promise<'stopped' | 'error' | undefined> {
  const { provider, sandboxId } = await actionResources(context)
  const sandbox = await provider.get(sandboxId)
  const status = providerState(sandbox.state)
  if (status === 'stopped') {
    await revokeWorkspacePreviews(
      context.env.DB,
      context.workspaceId,
      context.dependencies.now(),
    )
    return 'stopped'
  }
  if (status === 'error') return 'error'
  return undefined
}
