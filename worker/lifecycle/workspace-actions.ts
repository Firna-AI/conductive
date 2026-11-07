import { providerState } from './provider-state'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { orgSandboxProvider } from '../sandbox/client'
import { readWorkspace, revokeWorkspacePreviews } from './workspace-data'
import { firstOrgAdmin } from './settings-data'
import type { DurableLifecycle } from './durable'
import type {
  LifecycleReconciliation,
  LifecycleStopResult,
} from './durable-types'
import type { Sandbox, SandboxProvider } from '../sandbox/provider'

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
  const provider = await orgSandboxProvider(
    context.env,
    admin.userId,
    context.orgId,
    context.dependencies.fetch,
  )
  return { row, provider, sandboxId: row.sandboxId }
}

export async function stopWorkspaceSandbox(
  context: WorkspaceActionContext,
): Promise<LifecycleStopResult> {
  const { provider, sandboxId } = await actionResources(context)
  const sandbox = await replyOrCurrentState(provider, sandboxId, () =>
    provider.stop(sandboxId),
  )
  const status = await reconcileReply(context, sandbox)
  if (status) return status
  return 'pending'
}

export async function extendWorkspaceDeadline(
  context: WorkspaceActionContext,
): Promise<LifecycleReconciliation> {
  const { provider, sandboxId } = await actionResources(context)
  return reconcileReply(
    context,
    await replyOrCurrentState(provider, sandboxId, () =>
      provider.setAutoStop(sandboxId, 1_800),
    ),
  )
}

export async function reconcileWorkspaceSandbox(
  context: WorkspaceActionContext,
): Promise<LifecycleReconciliation> {
  const { provider, sandboxId } = await actionResources(context)
  return reconcileReply(context, await provider.get(sandboxId))
}

/** A refused control operation can mean the computer already stopped. Read once. */
async function replyOrCurrentState(
  provider: SandboxProvider,
  sandboxId: string,
  operation: () => Promise<Sandbox>,
): Promise<Sandbox> {
  try {
    return await operation()
  } catch (error) {
    const sandbox = await provider.get(sandboxId)
    const status = providerState(sandbox.state)
    if (status === 'stopped' || status === 'error') return sandbox
    throw error
  }
}

async function reconcileReply(
  context: WorkspaceActionContext,
  sandbox: Sandbox,
): Promise<LifecycleReconciliation> {
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
