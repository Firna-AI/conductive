export interface CodexConnection {
  ciphertext: string
  refreshClaim: string | null
  refreshClaimUntil: number | null
  failureCause: string | null
}

export function readCodexConnection(
  db: D1Database,
  userId: string,
): Promise<CodexConnection | null> {
  return db
    .prepare(
      `SELECT ciphertext, refresh_claim AS refreshClaim,
    refresh_claim_until AS refreshClaimUntil, failure_cause AS failureCause
    FROM agent_logins WHERE user_id = ? AND agent = 'codex' AND kind = 'token'`,
    )
    .bind(userId)
    .first<CodexConnection>()
}

export async function claimCodexRefresh(
  db: D1Database,
  userId: string,
  ciphertext: string,
  claim: string,
  until: number,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `UPDATE agent_logins SET refresh_claim = ?, refresh_claim_until = ?
    WHERE user_id = ? AND agent = 'codex' AND kind = 'token' AND ciphertext = ?
    AND refresh_claim IS NULL AND failure_cause IS NULL RETURNING user_id`,
      )
      .bind(claim, until, userId, ciphertext)
      .first()) !== null
  )
}

export async function finishCodexRefresh(
  db: D1Database,
  userId: string,
  previousCiphertext: string,
  claim: string,
  ciphertext: string,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `UPDATE agent_logins SET ciphertext = ?, refresh_claim = NULL, refresh_claim_until = NULL
    WHERE user_id = ? AND agent = 'codex' AND kind = 'token' AND ciphertext = ?
    AND refresh_claim = ? AND failure_cause IS NULL RETURNING user_id`,
      )
      .bind(ciphertext, userId, previousCiphertext, claim)
      .first()) !== null
  )
}

export async function failCodexRefresh(
  db: D1Database,
  userId: string,
  ciphertext: string,
  claim: string | null,
  cause: string,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `UPDATE agent_logins SET failure_cause = ?, refresh_claim = NULL, refresh_claim_until = NULL
    WHERE user_id = ? AND agent = 'codex' AND kind = 'token' AND ciphertext = ?
    AND refresh_claim IS ? AND failure_cause IS NULL RETURNING user_id`,
      )
      .bind(cause, userId, ciphertext, claim)
      .first()) !== null
  )
}
