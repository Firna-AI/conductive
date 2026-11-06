export const CLEANUP_LEASE_MS = 5 * 60 * 1000

/** Parameter order: org, lease token, current time, generation. Use within the lifecycle write. */
export const lifecycleWritePredicate = `EXISTS (
  SELECT 1 FROM org_deletions lifecycle_lease JOIN orgs lifecycle_org ON lifecycle_org.id = lifecycle_lease.org_id
  WHERE lifecycle_lease.org_id = ? AND lifecycle_lease.lease_token = ? AND lifecycle_lease.lease_until > ?
  AND lifecycle_org.lifecycle_generation = ? AND lifecycle_org.deleted_at IS NOT NULL
)`

export async function claimLifecycleGeneration(
  db: D1Database,
  orgId: string,
  token: string,
  now: number,
) {
  const row = await db
    .prepare(
      `UPDATE orgs SET lifecycle_generation = lifecycle_generation + 1
     WHERE id = ? AND deleted_at IS NOT NULL AND EXISTS (
       SELECT 1 FROM org_deletions WHERE org_id = ? AND lease_token = ? AND lease_until > ?
     ) RETURNING lifecycle_generation AS generation`,
    )
    .bind(orgId, orgId, token, now)
    .first<{ generation: number }>()
  return row?.generation ?? null
}

export async function renewLifecycleLease(
  db: D1Database,
  orgId: string,
  token: string,
  generation: number,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE org_deletions SET lease_until = ? WHERE org_id = ? AND lease_token = ? AND lease_until > ?
     AND EXISTS (SELECT 1 FROM orgs WHERE id = ? AND lifecycle_generation = ? AND deleted_at IS NOT NULL)`,
    )
    .bind(now + CLEANUP_LEASE_MS, orgId, token, now, orgId, generation)
    .run()
  return result.meta.changes > 0
}

export async function lifecycleOwnershipCurrent(
  db: D1Database,
  orgId: string,
  token: string,
  generation: number,
  now: number,
) {
  return (
    (await db
      .prepare(
        `SELECT 1 AS owned FROM org_deletions d JOIN orgs o ON o.id = d.org_id
     WHERE d.org_id = ? AND d.lease_token = ? AND d.lease_until > ?
     AND o.lifecycle_generation = ? AND o.deleted_at IS NOT NULL`,
      )
      .bind(orgId, token, now, generation)
      .first<{ owned: number }>()) !== null
  )
}
