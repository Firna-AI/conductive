import type { BoatKeyStatus } from '../../src/shared/api'
import { orgKeyMaintenancePredicate } from '../members/key-maintenance'
import type { BoatAccount } from '../sandbox/provider'

export interface StoredBoatKey {
  accountId: string
  accountType: BoatAccount['type']
  ciphertext: string
  updatedAt: number
}

export function readBoatKey(
  db: D1Database,
  orgId: string,
): Promise<StoredBoatKey | null> {
  return db
    .prepare(
      `SELECT account_id AS accountId, account_type AS accountType, ciphertext, updated_at AS updatedAt
     FROM boat_keys WHERE org_id = ?`,
    )
    .bind(orgId)
    .first<StoredBoatKey>()
}

export async function boatKeyStatus(
  db: D1Database,
  orgId: string,
): Promise<BoatKeyStatus> {
  const row = await db
    .prepare('SELECT updated_at AS updatedAt FROM boat_keys WHERE org_id = ?')
    .bind(orgId)
    .first<{ updatedAt: number }>()
  return row
    ? { configured: true, updatedAt: row.updatedAt }
    : { configured: false }
}

/** The insert guard covers first save and upsert. The account guard prevents cross-account replacement. */
export async function saveBoatKey(
  db: D1Database,
  orgId: string,
  userId: string,
  account: BoatAccount,
  ciphertext: string,
  now: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO boat_keys (org_id, account_id, account_type, ciphertext, created_at, updated_at)
     SELECT ?, ?, ?, ?, ?, ? WHERE ${orgKeyMaintenancePredicate}
     ON CONFLICT (org_id) DO UPDATE SET
       ciphertext = excluded.ciphertext, updated_at = excluded.updated_at
     WHERE boat_keys.account_id = excluded.account_id AND boat_keys.account_type = excluded.account_type
     RETURNING org_id`,
    )
    .bind(orgId, account.id, account.type, ciphertext, now, now, orgId, userId)
    .first()
  return row !== null
}
