import { ProviderError } from '../errors'
import type { Rejection } from './context'
import { PREFLIGHT_REFUSALS } from './errors'

export interface SnapshotRecord extends Rejection {
  name: string
  sourceSandboxId: string
  snapshotId: string | null
  state: 'pending' | 'ready' | 'retryable' | 'rejected' | 'deleted'
}

export async function claimSnapshot(
  db: D1Database,
  account: string,
  name: string,
  sandboxId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO e2b_snapshot_mappings (provider_account, name, source_sandbox_id) VALUES (?, ?, ?)
       ON CONFLICT (provider_account, name) DO UPDATE SET state = 'pending',
       rejection_status = NULL, rejection_code = NULL, rejection_retry_seconds = NULL
       WHERE e2b_snapshot_mappings.state = 'retryable'`,
    )
    .bind(account, name, sandboxId)
    .run()
  return result.meta.changes === 1
}

export function readSnapshotRecord(
  db: D1Database,
  account: string,
  name: string,
): Promise<SnapshotRecord | null> {
  return db
    .prepare(
      `SELECT name, source_sandbox_id AS sourceSandboxId, snapshot_id AS snapshotId, state,
    rejection_status AS rejectionStatus, rejection_code AS rejectionCode,
    rejection_retry_seconds AS rejectionRetrySeconds FROM e2b_snapshot_mappings
    WHERE provider_account = ? AND name = ?`,
    )
    .bind(account, name)
    .first<SnapshotRecord>()
}

export async function completeSnapshot(
  db: D1Database,
  account: string,
  name: string,
  snapshotId: string,
): Promise<void> {
  const result = await db
    .prepare(
      "UPDATE e2b_snapshot_mappings SET state = 'ready', snapshot_id = ? WHERE provider_account = ? AND name = ? AND state IN ('pending', 'rejected')",
    )
    .bind(snapshotId, account, name)
    .run()
  if (result.meta.changes === 0) {
    const current = await readSnapshotRecord(db, account, name)
    if (current?.state !== 'ready' || current.snapshotId !== snapshotId)
      throw new ProviderError('not_found', 404)
  }
}

export async function rejectSnapshot(
  db: D1Database,
  account: string,
  name: string,
  error: ProviderError,
  retryable = false,
): Promise<void> {
  await db
    .prepare(
      "UPDATE e2b_snapshot_mappings SET state = ?, rejection_status = ?, rejection_code = ?, rejection_retry_seconds = ? WHERE provider_account = ? AND name = ? AND state = 'pending'",
    )
    .bind(
      retryable ? 'retryable' : 'rejected',
      error.status,
      error.providerCode,
      error.retryAfterSeconds,
      account,
      name,
    )
    .run()
}

export async function retireAbsentSnapshot(
  db: D1Database,
  account: string,
  name: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO e2b_snapshot_mappings (provider_account, name, source_sandbox_id, state)
    VALUES (?, ?, '', 'deleted') ON CONFLICT (provider_account, name) DO UPDATE SET state = 'deleted'
    WHERE e2b_snapshot_mappings.snapshot_id IS NULL AND
      (e2b_snapshot_mappings.state = 'retryable' OR
       (e2b_snapshot_mappings.state = 'rejected' AND e2b_snapshot_mappings.rejection_status IN (${PREFLIGHT_REFUSALS.join(',')})))`,
    )
    .bind(account, name)
    .run()
  return result.meta.changes === 1
}

export async function deleteSnapshotRecord(
  db: D1Database,
  account: string,
  name: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE e2b_snapshot_mappings SET state = 'deleted' WHERE provider_account = ? AND name = ?",
    )
    .bind(account, name)
    .run()
}
