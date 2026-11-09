export interface ComputerOwnership {
  orgId: string
  ownerUserId: string | null
  purpose: 'workspace' | 'build'
  purposeId: string
}

const currentOwner = `COALESCE((SELECT owner_user_id FROM workspaces
  WHERE id = ? AND org_id = ?), (SELECT owner_user_id FROM computer_ledger
  WHERE org_id = ? AND purpose = 'workspace' AND purpose_id = ?
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
        `INSERT INTO computer_ledger (allocation_key, org_id, owner_user_id, purpose, purpose_id)
       VALUES (?, ?, ${currentOwner}, ?, ?) ON CONFLICT(allocation_key) DO NOTHING`,
      )
      .bind(
        key,
        ownership.orgId,
        ownership.purpose === 'workspace' ? ownership.purposeId : null,
        ownership.orgId,
        ownership.orgId,
        ownership.purpose === 'workspace' ? ownership.purposeId : null,
        ownership.ownerUserId,
        ownership.purpose,
        ownership.purposeId,
      ),
    db
      .prepare(
        'UPDATE computer_ledger SET create_rejected = 0 WHERE allocation_key = ? AND create_rejected = 1',
      )
      .bind(key),
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
           (SELECT owner_user_id FROM computer_ledger WHERE allocation_key = ?), owner_user_id, ?),
         purpose = ?, purpose_id = ? WHERE sandbox_id = ? AND org_id = ? AND allocation_key IS NULL`,
      )
      .bind(
        ownership.purpose === 'workspace' ? ownership.purposeId : null,
        ownership.orgId,
        key,
        ownership.ownerUserId,
        ownership.purpose,
        ownership.purposeId,
        sandboxId,
        ownership.orgId,
      ),
    db
      .prepare(
        `DELETE FROM computer_ledger WHERE allocation_key = ? AND sandbox_id IS NULL
         AND EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = ? AND org_id = ?)`,
      )
      .bind(key, sandboxId, ownership.orgId),
    db
      .prepare(
        `UPDATE computer_ledger SET allocation_key = ?
         WHERE sandbox_id = ? AND org_id = ? AND allocation_key IS NULL`,
      )
      .bind(key, sandboxId, ownership.orgId),
    db
      .prepare(
        'UPDATE computer_ledger SET sandbox_id = ?, create_rejected = 0 WHERE allocation_key = ? AND org_id = ?',
      )
      .bind(sandboxId, key, ownership.orgId),
  ])
}

export async function rejectComputerIntent(
  db: D1Database,
  key: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE computer_ledger SET create_rejected = 1 WHERE allocation_key = ? AND sandbox_id IS NULL',
    )
    .bind(key)
    .run()
}

export function computerDeletedStatement(
  db: D1Database,
  sandboxId: string,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE computer_ledger SET deleted_at = COALESCE(deleted_at, ?), cleanup_pending = 0
       WHERE sandbox_id = ?`,
    )
    .bind(now, sandboxId)
}

export async function pendingComputerCleanup(
  db: D1Database,
  workspaceId: string,
) {
  return (
    await db
      .prepare(
        `SELECT org_id AS orgId, sandbox_id AS sandboxId FROM computer_ledger
         WHERE purpose = 'workspace' AND purpose_id = ? AND cleanup_pending = 1
           AND deleted_at IS NULL AND sandbox_id IS NOT NULL ORDER BY id`,
      )
      .bind(workspaceId)
      .all<{ orgId: string; sandboxId: string }>()
  ).results
}
