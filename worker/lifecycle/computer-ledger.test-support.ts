export interface ComputerRecord {
  allocationKey: string | null
  sandboxId: string | null
  orgId: string
  ownerUserId: string | null
  purpose: 'workspace' | 'build' | 'retained'
  purposeId: string | null
  cleanupPending: number
  deletedAt: number | null
}

export async function computerRecords(db: D1Database) {
  return (
    await db
      .prepare(
        `SELECT allocation_key AS allocationKey, sandbox_id AS sandboxId,
         org_id AS orgId, owner_user_id AS ownerUserId, purpose, purpose_id AS purposeId,
         cleanup_pending AS cleanupPending, deleted_at AS deletedAt
         FROM computer_ledger ORDER BY id`,
      )
      .all<ComputerRecord>()
  ).results
}
