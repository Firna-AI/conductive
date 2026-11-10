import type { AppDependencies, AppEnv } from '../env'
import { orgProviderForAccount } from '../sandbox/client'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { firstOrgAdmin } from './settings-data'
import {
  computerDeletedStatement,
  pendingComputerCleanup,
} from './computer-ledger'

export interface SandboxCleanup {
  workspaceId: string
  orgId: string
  sandboxId: string
  providerAccount: string
}

export async function recordSandboxCleanup(
  db: D1Database,
  cleanup: SandboxCleanup,
): Promise<void> {
  await db
    .prepare(
      'INSERT OR REPLACE INTO lifecycle_sandbox_cleanup (workspace_id, org_id, sandbox_id, provider_account) VALUES (?, ?, ?, ?)',
    )
    .bind(
      cleanup.workspaceId,
      cleanup.orgId,
      cleanup.sandboxId,
      cleanup.providerAccount,
    )
    .run()
}

export async function retrySandboxCleanup(
  env: AppEnv,
  dependencies: AppDependencies,
  workspaceId: string,
): Promise<boolean> {
  const current = await env.DB.prepare(
    'SELECT org_id AS orgId, sandbox_id AS sandboxId, provider_account AS providerAccount FROM lifecycle_sandbox_cleanup WHERE workspace_id = ?',
  )
    .bind(workspaceId)
    .first<{ orgId: string; sandboxId: string; providerAccount: string }>()
  const cleanups = (await pendingComputerCleanup(env.DB, workspaceId)).map(
    (cleanup) => ({
      ...cleanup,
      providerAccount:
        current?.sandboxId === cleanup.sandboxId
          ? current.providerAccount
          : DEFAULT_PROVIDER_ACCOUNT,
    }),
  )
  if (
    current &&
    !cleanups.some((cleanup) => cleanup.sandboxId === current.sandboxId)
  )
    cleanups.push(current)
  for (const cleanup of cleanups) {
    const admin = await firstOrgAdmin(env.DB, cleanup.orgId)
    if (!admin) return false
    const provider = await orgProviderForAccount(
      env,
      admin.userId,
      cleanup.orgId,
      dependencies.fetch,
      cleanup.providerAccount,
    )
    await deleteSandboxIfPresent(
      env.DB,
      provider,
      cleanup.sandboxId,
      dependencies.now(),
    )
    await clearSandboxCleanup(
      env.DB,
      workspaceId,
      cleanup.sandboxId,
      cleanup.providerAccount,
    )
  }
  return true
}

export async function clearSandboxCleanup(
  db: D1Database,
  workspaceId: string,
  sandboxId: string,
  providerAccount: string,
): Promise<void> {
  await db
    .prepare(
      'DELETE FROM lifecycle_sandbox_cleanup WHERE workspace_id = ? AND sandbox_id = ? AND provider_account = ?',
    )
    .bind(workspaceId, sandboxId, providerAccount)
    .run()
}

export async function deleteSandboxIfPresent(
  db: D1Database,
  provider: SandboxProvider,
  id: string,
  now: number,
): Promise<void> {
  try {
    await provider.delete(id)
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
  await computerDeletedStatement(db, id, now).run()
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
