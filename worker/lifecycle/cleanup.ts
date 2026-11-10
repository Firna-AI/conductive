import type { AppDependencies, AppEnv } from '../env'
import { orgProviderForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { firstOrgAdmin } from './settings-data'
import {
  computerDeletedStatement,
  computerIdentityKey,
  pendingComputerCleanup,
  type ComputerIdentity,
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
    .first<ComputerIdentity & { orgId: string }>()
  const cleanups = new Map(
    (await pendingComputerCleanup(env.DB, workspaceId)).map((cleanup) => [
      computerIdentityKey(cleanup),
      cleanup,
    ]),
  )
  if (current) cleanups.set(computerIdentityKey(current), current)
  for (const cleanup of cleanups.values()) {
    const admin = await firstOrgAdmin(env.DB, cleanup.orgId)
    if (!admin) return false
    const provider = await orgProviderForAccount(
      env,
      admin.userId,
      cleanup.orgId,
      dependencies.fetch,
      cleanup.providerAccount,
    )
    await deleteSandboxIfPresent(env.DB, provider, cleanup, dependencies.now())
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
  computer: ComputerIdentity,
  now: number,
): Promise<void> {
  try {
    await provider.delete(computer.sandboxId)
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
  await computerDeletedStatement(db, computer, now).run()
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
