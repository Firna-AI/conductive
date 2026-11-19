export function trafficStatement(
  db: D1Database,
  account: string,
  sandboxId: string,
  ciphertext: string,
  createKey?: string,
): D1PreparedStatement {
  const condition =
    createKey !== undefined
      ? "EXISTS (SELECT 1 FROM e2b_create_operations WHERE provider_account = ? AND idempotency_key = ? AND state IN ('pending', 'ready'))"
      : "(NOT EXISTS (SELECT 1 FROM e2b_create_operations WHERE provider_account = ? AND sandbox_id = ? AND state = 'deleted') OR EXISTS (SELECT 1 FROM e2b_create_operations WHERE provider_account = ? AND sandbox_id = ? AND state = 'ready'))"
  const identity =
    createKey !== undefined
      ? [account, createKey]
      : [account, sandboxId, account, sandboxId]
  return db
    .prepare(
      `INSERT INTO e2b_traffic_tokens (provider_account, sandbox_id, ciphertext) SELECT ?, ?, ? WHERE ${condition}
    ON CONFLICT (provider_account, sandbox_id) DO UPDATE SET ciphertext = excluded.ciphertext`,
    )
    .bind(account, sandboxId, ciphertext, ...identity)
}

export function readTrafficCiphertext(
  db: D1Database,
  account: string,
  sandboxId: string,
): Promise<string | null> {
  return db
    .prepare(
      'SELECT ciphertext FROM e2b_traffic_tokens WHERE provider_account = ? AND sandbox_id = ?',
    )
    .bind(account, sandboxId)
    .first<string>('ciphertext')
}
