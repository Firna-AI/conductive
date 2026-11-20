import type { ProviderError } from '../errors'
import type { Rejection } from './context'
import { PREFLIGHT_REFUSALS } from './errors'

export interface CreateRecord extends Rejection {
  state: 'pending' | 'ready' | 'retryable' | 'rejected' | 'deleted'
  sandboxId: string | null
}

export async function claimCreate(
  db: D1Database,
  account: string,
  key: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO e2b_create_operations (provider_account, idempotency_key) VALUES (?, ?)
       ON CONFLICT (provider_account, idempotency_key) DO UPDATE SET state = 'pending',
       rejection_status = NULL, rejection_code = NULL, rejection_retry_seconds = NULL
       WHERE e2b_create_operations.state = 'retryable'`,
    )
    .bind(account, key)
    .run()
  return result.meta.changes === 1
}

export function readCreate(
  db: D1Database,
  account: string,
  key: string,
): Promise<CreateRecord | null> {
  return db
    .prepare(
      `SELECT state, sandbox_id AS sandboxId, rejection_status AS rejectionStatus,
    rejection_code AS rejectionCode, rejection_retry_seconds AS rejectionRetrySeconds
    FROM e2b_create_operations WHERE provider_account = ? AND idempotency_key = ?`,
    )
    .bind(account, key)
    .first<CreateRecord>()
}

export function completeCreateStatement(
  db: D1Database,
  account: string,
  key: string,
  sandboxId: string,
): D1PreparedStatement {
  return db
    .prepare(
      "UPDATE e2b_create_operations SET state = 'ready', sandbox_id = ? WHERE provider_account = ? AND idempotency_key = ? AND state IN ('pending', 'rejected')",
    )
    .bind(sandboxId, account, key)
}

export async function rejectCreate(
  db: D1Database,
  account: string,
  key: string,
  error: ProviderError,
  retryable = false,
): Promise<void> {
  await db
    .prepare(
      "UPDATE e2b_create_operations SET state = ?, rejection_status = ?, rejection_code = ?, rejection_retry_seconds = ? WHERE provider_account = ? AND idempotency_key = ? AND state = 'pending'",
    )
    .bind(
      retryable ? 'retryable' : 'rejected',
      error.status,
      error.providerCode,
      error.retryAfterSeconds,
      account,
      key,
    )
    .run()
}

export async function retireUnallocatedCreate(
  db: D1Database,
  account: string,
  key: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO e2b_create_operations (provider_account, idempotency_key, state)
    VALUES (?, ?, 'deleted') ON CONFLICT (provider_account, idempotency_key) DO UPDATE SET state = 'deleted'
    WHERE e2b_create_operations.sandbox_id IS NULL AND
      (e2b_create_operations.state = 'retryable' OR
       (e2b_create_operations.state = 'rejected' AND e2b_create_operations.rejection_status IN (${PREFLIGHT_REFUSALS.join(',')})))`,
    )
    .bind(account, key)
    .run()
  return result.meta.changes === 1
}

export async function deleteSandboxState(
  db: D1Database,
  account: string,
  sandboxId: string,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'DELETE FROM e2b_traffic_tokens WHERE provider_account = ? AND sandbox_id = ?',
      )
      .bind(account, sandboxId),
    db
      .prepare(
        "UPDATE e2b_create_operations SET state = 'deleted' WHERE provider_account = ? AND sandbox_id = ?",
      )
      .bind(account, sandboxId),
  ])
}
