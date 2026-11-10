export interface ComputerIdentity {
  providerAccount: string
  sandboxId: string
}

export function computerIdentityKey(computer: ComputerIdentity): string {
  return JSON.stringify([computer.providerAccount, computer.sandboxId])
}

export interface ComputerOwnership {
  orgId: string
  providerAccount: string
  ownerUserId: string | null
  purpose: 'workspace' | 'build'
  purposeId: string
}

const currentOwner = `COALESCE((SELECT owner_user_id FROM workspaces
  WHERE id = ? AND org_id = ?), (SELECT owner_user_id FROM computer_ledger
  WHERE org_id = ? AND provider_account = ? AND purpose = 'workspace' AND purpose_id = ?
    AND deleted_at IS NULL AND owner_user_id IS NOT NULL ORDER BY id DESC LIMIT 1), ?)`

export async function recordComputerIntent(
  db: D1Database,
  key: string,
  ownership: ComputerOwnership,
  mayHaveAllocated: boolean,
): Promise<boolean> {
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO computer_ledger (allocation_key, provider_account, org_id, owner_user_id, purpose, purpose_id)
       VALUES (?, ?, ?, ${currentOwner}, ?, ?) ON CONFLICT(provider_account, allocation_key) DO NOTHING`,
      )
      .bind(
        key,
        ownership.providerAccount,
        ownership.orgId,
        ownership.purpose === 'workspace' ? ownership.purposeId : null,
        ownership.orgId,
        ownership.orgId,
        ownership.providerAccount,
        ownership.purpose === 'workspace' ? ownership.purposeId : null,
        ownership.ownerUserId,
        ownership.purpose,
        ownership.purposeId,
      ),
    db
      .prepare(
        'UPDATE computer_ledger SET create_rejected = 0 WHERE allocation_key = ? AND provider_account = ? AND create_rejected = 1',
      )
      .bind(key, ownership.providerAccount),
  ])
  return (
    results[1].meta.changes > 0 ||
    (!mayHaveAllocated && results[0].meta.changes > 0)
  )
}

/** A pre-ledger allocation can already have an imported provider identity. */
export async function attachComputer(
  db: D1Database,
  key: string,
  sandboxId: string,
  ownership: ComputerOwnership,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE computer_ledger SET owner_user_id = COALESCE(
           (SELECT owner_user_id FROM workspaces WHERE id = ? AND org_id = ?),
           (SELECT owner_user_id FROM computer_ledger WHERE allocation_key = ? AND provider_account = ?), owner_user_id, ?),
         purpose = ?, purpose_id = ? WHERE sandbox_id = ? AND org_id = ? AND provider_account = ? AND allocation_key IS NULL`,
      )
      .bind(
        ownership.purpose === 'workspace' ? ownership.purposeId : null,
        ownership.orgId,
        key,
        ownership.providerAccount,
        ownership.ownerUserId,
        ownership.purpose,
        ownership.purposeId,
        sandboxId,
        ownership.orgId,
        ownership.providerAccount,
      ),
    db
      .prepare(
        `DELETE FROM computer_ledger WHERE allocation_key = ? AND provider_account = ? AND sandbox_id IS NULL
         AND EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = ? AND org_id = ? AND provider_account = ?)`,
      )
      .bind(
        key,
        ownership.providerAccount,
        sandboxId,
        ownership.orgId,
        ownership.providerAccount,
      ),
    db
      .prepare(
        `UPDATE computer_ledger SET allocation_key = ?
         WHERE sandbox_id = ? AND org_id = ? AND provider_account = ? AND allocation_key IS NULL`,
      )
      .bind(key, sandboxId, ownership.orgId, ownership.providerAccount),
    db
      .prepare(
        'UPDATE computer_ledger SET sandbox_id = ?, create_rejected = 0 WHERE allocation_key = ? AND org_id = ? AND provider_account = ?',
      )
      .bind(sandboxId, key, ownership.orgId, ownership.providerAccount),
  ])
}

export async function rejectComputerIntent(
  db: D1Database,
  key: string,
  providerAccount: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE computer_ledger SET create_rejected = 1 WHERE allocation_key = ? AND provider_account = ? AND sandbox_id IS NULL',
    )
    .bind(key, providerAccount)
    .run()
}

export function computerDeletedStatement(
  db: D1Database,
  computer: ComputerIdentity,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE computer_ledger SET deleted_at = COALESCE(deleted_at, ?), cleanup_pending = 0
       WHERE sandbox_id = ? AND provider_account = ?`,
    )
    .bind(now, computer.sandboxId, computer.providerAccount)
}

export async function pendingComputerCleanup(
  db: D1Database,
  workspaceId: string,
) {
  return (
    await db
      .prepare(
        `SELECT org_id AS orgId, sandbox_id AS sandboxId, provider_account AS providerAccount FROM computer_ledger
         WHERE purpose = 'workspace' AND purpose_id = ? AND cleanup_pending = 1
           AND deleted_at IS NULL AND sandbox_id IS NOT NULL ORDER BY id`,
      )
      .bind(workspaceId)
      .all<ComputerIdentity & { orgId: string }>()
  ).results
}

export async function liveBuildComputers(
  db: D1Database,
  orgId: string,
  buildId: string,
): Promise<ComputerIdentity[]> {
  const { results } = await db
    .prepare(
      `SELECT sandbox_id AS sandboxId, provider_account AS providerAccount FROM computer_ledger WHERE org_id = ?
     AND purpose = 'build' AND purpose_id = ? AND deleted_at IS NULL
     AND create_rejected = 0 AND sandbox_id IS NOT NULL ORDER BY id`,
    )
    .bind(orgId, buildId)
    .all<ComputerIdentity>()
  return results
}

export async function liveOrgComputer(
  db: D1Database,
  orgId: string,
  computer: ComputerIdentity,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `SELECT id FROM computer_ledger WHERE org_id = ? AND sandbox_id = ? AND provider_account = ?
     AND deleted_at IS NULL AND create_rejected = 0`,
      )
      .bind(orgId, computer.sandboxId, computer.providerAccount)
      .first()) !== null
  )
}
