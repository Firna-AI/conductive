import { defaultAgentLoginNoReuse } from '../../src/shared/account'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'

const CURRENT_LOGIN_DATE = `(SELECT updated_at FROM agent_logins
  WHERE user_id = codex_devices.user_id AND agent = 'codex')`

export interface StoredCodexDevice {
  ciphertext: string | null
  state: 'pending' | 'polling' | 'connected' | 'expired' | 'failed'
  pollIntervalMs: number
  nextPollAt: number
  expiresAt: number
  pollClaim: string | null
  pollClaimUntil: number | null
  failureCause: string | null
}

export async function insertCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
  ciphertext: string,
  pollIntervalMs: number,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO codex_devices
    (handle_hash, user_id, ciphertext, state, poll_interval_ms, next_poll_at, expires_at, login_updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?,
      (SELECT updated_at FROM agent_logins WHERE user_id = ? AND agent = 'codex'))`,
    )
    .bind(
      handleHash,
      userId,
      ciphertext,
      pollIntervalMs,
      now + pollIntervalMs,
      now + 900_000,
      userId,
    )
    .run()
}

export function readCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
): Promise<StoredCodexDevice | null> {
  return db
    .prepare(
      `SELECT ciphertext, state, poll_interval_ms AS pollIntervalMs,
    next_poll_at AS nextPollAt, expires_at AS expiresAt, poll_claim AS pollClaim,
    poll_claim_until AS pollClaimUntil, failure_cause AS failureCause
    FROM codex_devices WHERE handle_hash = ? AND user_id = ?`,
    )
    .bind(handleHash, userId)
    .first<StoredCodexDevice>()
}

export async function expireCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE codex_devices SET state = 'expired', ciphertext = NULL,
    poll_claim = NULL, poll_claim_until = NULL
    WHERE handle_hash = ? AND user_id = ? AND expires_at <= ?`,
    )
    .bind(handleHash, userId, now)
    .run()
}

export async function claimCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
  claim: string,
  now: number,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `UPDATE codex_devices SET state = 'polling', poll_claim = ?, poll_claim_until = ?
    WHERE handle_hash = ? AND user_id = ? AND state = 'pending' AND expires_at > ? AND next_poll_at <= ?
    RETURNING handle_hash`,
      )
      .bind(claim, now + 35_000, handleHash, userId, now, now)
      .first()) !== null
  )
}

export async function releaseCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
  claim: string,
  nextPollAt: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE codex_devices SET state = 'pending', poll_claim = NULL,
    poll_claim_until = NULL, next_poll_at = ?
    WHERE handle_hash = ? AND user_id = ? AND state = 'polling' AND poll_claim = ?`,
    )
    .bind(nextPollAt, handleHash, userId, claim)
    .run()
}

export async function failCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
  claim: string,
  cause: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE codex_devices SET state = 'failed', ciphertext = NULL,
    poll_claim = NULL, poll_claim_until = NULL, failure_cause = ?
    WHERE handle_hash = ? AND user_id = ? AND state = 'polling' AND poll_claim = ?`,
    )
    .bind(cause, handleHash, userId, claim)
    .run()
}

function changedLoginStatement(
  db: D1Database,
  userId: string,
  handleHash: string,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE codex_devices SET state = 'failed', ciphertext = NULL,
      poll_claim = NULL, poll_claim_until = NULL, failure_cause = ?
      WHERE handle_hash = ? AND user_id = ? AND state IN ('pending', 'polling')
      AND login_updated_at IS NOT ${CURRENT_LOGIN_DATE}`,
    )
    .bind(chatGptSignInCopy.causes.loginChanged, handleHash, userId)
}

export async function invalidateChangedCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
): Promise<string | null> {
  const results = await db.batch<Pick<StoredCodexDevice, 'failureCause'>>([
    changedLoginStatement(db, userId, handleHash),
    db
      .prepare(
        `SELECT failure_cause AS failureCause FROM codex_devices
        WHERE handle_hash = ? AND user_id = ? AND state = 'failed'`,
      )
      .bind(handleHash, userId),
  ])
  return results[1].results[0]?.failureCause ?? null
}

export async function finishCodexDevice(
  db: D1Database,
  userId: string,
  handleHash: string,
  claim: string,
  ciphertext: string,
  now: number,
): Promise<void> {
  await db.batch([
    changedLoginStatement(db, userId, handleHash),
    db
      .prepare(
        `INSERT INTO agent_logins
      (user_id, agent, kind, ciphertext, no_reuse, created_at, updated_at)
      SELECT user_id, 'codex', 'token', ?, ?, ?, ? FROM codex_devices
      WHERE handle_hash = ? AND user_id = ? AND state = 'polling' AND poll_claim = ? AND expires_at > ?
      AND login_updated_at IS ${CURRENT_LOGIN_DATE}
      ON CONFLICT(user_id, agent) DO UPDATE SET kind = excluded.kind, ciphertext = excluded.ciphertext,
      no_reuse = CASE WHEN agent_logins.kind = excluded.kind THEN agent_logins.no_reuse ELSE excluded.no_reuse END,
      updated_at = excluded.updated_at, refresh_claim = NULL, refresh_claim_until = NULL, failure_cause = NULL`,
      )
      .bind(
        ciphertext,
        defaultAgentLoginNoReuse('codex', 'token') ? 1 : 0,
        now,
        now,
        handleHash,
        userId,
        claim,
        now,
      ),
    db
      .prepare(
        `UPDATE codex_devices SET state = 'connected', ciphertext = NULL,
      poll_claim = NULL, poll_claim_until = NULL
      WHERE handle_hash = ? AND user_id = ? AND state = 'polling' AND poll_claim = ? AND expires_at > ?`,
      )
      .bind(handleHash, userId, claim, now),
  ])
}

export async function cleanupCodexDevices(
  db: D1Database,
  now: number,
): Promise<void> {
  await db
    .prepare('DELETE FROM codex_devices WHERE expires_at <= ?')
    .bind(now)
    .run()
}
