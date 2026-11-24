import { runningWorkspacePredicate } from '../operator/workspace-counts'
import type { ComputerOwner } from './identity'

export interface ComputerRow {
  id: string
  orgId: string
  name: string
  addedAt: number
  codeExpiresAt: number | null
  hasCode: number
  connectedAt: number | null
  lastSeenAt: number | null
  cpus: number | null
  memoryBytes: number | null
  system: string | null
  limit: number | null
  buildRequestedAt: number | null
  runningWorkspaces: number
  workspaces: number
}

const computers = `
  SELECT c.id, c.org_id AS orgId, c.name, c.added_at AS addedAt,
         c.code_expires_at AS codeExpiresAt, c.code_digest IS NOT NULL AS hasCode,
         c.connected_at AS connectedAt, c.last_seen_at AS lastSeenAt,
         c.cpus, c.memory_bytes AS memoryBytes, c.system,
         c.workspace_limit AS "limit", c.build_requested_at AS buildRequestedAt,
         COUNT(CASE WHEN ${runningWorkspacePredicate} THEN 1 END) AS runningWorkspaces,
         COUNT(w.id) AS workspaces
  FROM own_computers c
  LEFT JOIN workspaces w ON w.org_id = c.org_id AND w.computer_id = c.id
  WHERE c.org_id = ? AND c.removed_at IS NULL`

export async function listComputers(db: D1Database, orgId: string) {
  const { results } = await db
    .prepare(`${computers} GROUP BY c.id ORDER BY c.added_at, c.id`)
    .bind(orgId)
    .all<ComputerRow>()
  return results
}

export function readComputer(db: D1Database, owner: ComputerOwner) {
  return db
    .prepare(`${computers} AND c.id = ? GROUP BY c.id`)
    .bind(owner.orgId, owner.computerId)
    .first<ComputerRow>()
}

export async function setComputerLimit(
  db: D1Database,
  owner: ComputerOwner,
  limit: number,
) {
  const result = await db
    .prepare(
      `UPDATE own_computers SET workspace_limit = ?
       WHERE org_id = ? AND id = ? AND removed_at IS NULL AND connected_at IS NOT NULL`,
    )
    .bind(limit, owner.orgId, owner.computerId)
    .run()
  return result.meta.changes === 1
}

export async function recordBuildRequest(
  db: D1Database,
  owner: ComputerOwner,
  userId: string,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE own_computers SET build_requested_at = ?, build_requested_by_user_id = ?
       WHERE org_id = ? AND id = ? AND removed_at IS NULL AND connected_at IS NOT NULL`,
    )
    .bind(now, userId, owner.orgId, owner.computerId)
    .run()
  return result.meta.changes === 1
}

export async function markComputerRemoved(
  db: D1Database,
  owner: ComputerOwner,
  userId: string,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE own_computers
       SET removed_at = ?, removed_by_user_id = ?, token_digest = NULL,
           code_digest = NULL, code_ciphertext = NULL, code_expires_at = NULL
       WHERE org_id = ? AND id = ? AND removed_at IS NULL`,
    )
    .bind(now, userId, owner.orgId, owner.computerId)
    .run()
  return result.meta.changes === 1
}
