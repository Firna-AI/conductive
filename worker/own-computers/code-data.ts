import type { ComputerOwner } from './identity'

export interface StoredComputerCode {
  digest: string
  ciphertext: string
  expiresAt: number
}

export async function insertComputer(
  db: D1Database,
  owner: ComputerOwner,
  name: string,
  userId: string,
  addedAt: number,
  code: StoredComputerCode,
) {
  await db
    .prepare(
      `INSERT INTO own_computers
       (id, org_id, name, added_by_user_id, added_at, code_digest, code_ciphertext, code_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      owner.computerId,
      owner.orgId,
      name,
      userId,
      addedAt,
      code.digest,
      code.ciphertext,
      code.expiresAt,
    )
    .run()
}

export function readCurrentCode(
  db: D1Database,
  owner: ComputerOwner,
  now: number,
) {
  return db
    .prepare(
      `SELECT code_ciphertext AS ciphertext, code_expires_at AS expiresAt
       FROM own_computers WHERE org_id = ? AND id = ? AND removed_at IS NULL
         AND connected_at IS NULL AND code_digest IS NOT NULL AND code_expires_at > ?`,
    )
    .bind(owner.orgId, owner.computerId, now)
    .first<Pick<StoredComputerCode, 'ciphertext' | 'expiresAt'>>()
}

export async function replaceComputerCode(
  db: D1Database,
  owner: ComputerOwner,
  code: StoredComputerCode,
) {
  const result = await db
    .prepare(
      `UPDATE own_computers
       SET code_digest = ?, code_ciphertext = ?, code_expires_at = ?, token_digest = NULL
       WHERE org_id = ? AND id = ? AND removed_at IS NULL AND connected_at IS NULL`,
    )
    .bind(
      code.digest,
      code.ciphertext,
      code.expiresAt,
      owner.orgId,
      owner.computerId,
    )
    .run()
  return result.meta.changes === 1
}

export function computerIdByCode(db: D1Database, digest: string) {
  return db
    .prepare('SELECT id FROM own_computers WHERE code_digest = ?')
    .bind(digest)
    .first<string>('id')
}

export async function consumeComputerCode(
  db: D1Database,
  computerId: string,
  codeDigest: string,
  tokenDigest: string,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE own_computers SET code_digest = NULL, code_ciphertext = NULL, token_digest = ?
       WHERE id = ? AND code_digest = ? AND code_expires_at > ?
         AND connected_at IS NULL AND removed_at IS NULL`,
    )
    .bind(tokenDigest, computerId, codeDigest, now)
    .run()
  return result.meta.changes === 1
}
