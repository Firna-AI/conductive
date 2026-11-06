interface GitHubConnection {
  ciphertext: string
  refreshClaim: string | null
  refreshClaimUntil: number | null
}

export function readGitHubConnection(
  db: D1Database,
  userId: string,
): Promise<GitHubConnection | null> {
  return db
    .prepare(
      `SELECT ciphertext, refresh_claim AS refreshClaim,
       refresh_claim_until AS refreshClaimUntil
       FROM github_connections WHERE user_id = ?`,
    )
    .bind(userId)
    .first<GitHubConnection>()
}

export async function saveGitHubConnection(
  db: D1Database,
  userId: string,
  ciphertext: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO github_connections (user_id, ciphertext, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         ciphertext = excluded.ciphertext, updated_at = excluded.updated_at,
         refresh_claim = NULL, refresh_claim_until = NULL`,
    )
    .bind(userId, ciphertext, now)
    .run()
}

export async function claimGitHubRefresh(
  db: D1Database,
  userId: string,
  ciphertext: string,
  claim: string,
  until: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `UPDATE github_connections SET refresh_claim = ?, refresh_claim_until = ?
       WHERE user_id = ? AND ciphertext = ? AND refresh_claim IS NULL
       RETURNING user_id`,
    )
    .bind(claim, until, userId, ciphertext)
    .first()
  return row !== null
}

export async function finishGitHubRefresh(
  db: D1Database,
  userId: string,
  previousCiphertext: string,
  claim: string,
  ciphertext: string,
  now: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `UPDATE github_connections SET ciphertext = ?, updated_at = ?,
         refresh_claim = NULL, refresh_claim_until = NULL
       WHERE user_id = ? AND ciphertext = ? AND refresh_claim = ?
       RETURNING user_id`,
    )
    .bind(ciphertext, now, userId, previousCiphertext, claim)
    .first()
  return row !== null
}
