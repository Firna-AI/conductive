import type { AppDependencies, AppEnv } from '../env'
import { orgSandboxProvider } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { firstOrgAdmin } from './settings-data'

export interface SandboxCleanup {
  workspaceId: string
  orgId: string
  sandboxId: string
}

export async function recordSandboxCleanup(
  db: D1Database,
  cleanup: SandboxCleanup,
): Promise<void> {
  await db
    .prepare(
      'INSERT OR REPLACE INTO lifecycle_sandbox_cleanup (workspace_id, org_id, sandbox_id) VALUES (?, ?, ?)',
    )
    .bind(cleanup.workspaceId, cleanup.orgId, cleanup.sandboxId)
    .run()
}

export async function retrySandboxCleanup(
  env: AppEnv,
  dependencies: AppDependencies,
  workspaceId: string,
): Promise<boolean> {
  const cleanup = await env.DB.prepare(
    'SELECT org_id AS orgId, sandbox_id AS sandboxId FROM lifecycle_sandbox_cleanup WHERE workspace_id = ?',
  )
    .bind(workspaceId)
    .first<{ orgId: string; sandboxId: string }>()
  if (!cleanup) return true
  const admin = await firstOrgAdmin(env.DB, cleanup.orgId)
  if (!admin) return false
  const provider = await orgSandboxProvider(
    env,
    admin.userId,
    cleanup.orgId,
    dependencies.fetch,
  )
  await deleteSandboxIfPresent(provider, cleanup.sandboxId)
  await clearSandboxCleanup(env.DB, workspaceId, cleanup.sandboxId)
  return true
}

export async function clearSandboxCleanup(
  db: D1Database,
  workspaceId: string,
  sandboxId: string,
): Promise<void> {
  await db
    .prepare(
      'DELETE FROM lifecycle_sandbox_cleanup WHERE workspace_id = ? AND sandbox_id = ?',
    )
    .bind(workspaceId, sandboxId)
    .run()
}

export async function deleteSandboxIfPresent(
  provider: SandboxProvider,
  id: string,
): Promise<void> {
  try {
    await provider.delete(id)
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
}

export async function deleteSnapshotIfPresent(
  provider: SandboxProvider,
  name: string,
): Promise<void> {
  try {
    await provider.deleteSnapshot(name)
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
}
