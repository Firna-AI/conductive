import type { ComputerToWorker } from '../../src/shared/generated/ComputerToWorker'
import type { ComputerResources } from '../../src/shared/generated/ComputerResources'
import type { ComputerOwner } from './identity'

interface ComputerAccess {
  tokenDigest: string | null
  removedAt: number | null
}

export function readComputerAccess(db: D1Database, owner: ComputerOwner) {
  return db
    .prepare(
      `SELECT token_digest AS tokenDigest, removed_at AS removedAt
       FROM own_computers WHERE org_id = ? AND id = ?`,
    )
    .bind(owner.orgId, owner.computerId)
    .first<ComputerAccess>()
}

export function findComputerByToken(db: D1Database, digest: string) {
  return db
    .prepare(
      `SELECT org_id AS orgId, id AS computerId FROM own_computers
       WHERE token_digest = ? AND removed_at IS NULL`,
    )
    .bind(digest)
    .first<ComputerOwner>()
}

export function defaultComputerLimit(resources: ComputerResources) {
  return Math.max(
    1,
    Math.min(
      Math.floor(resources.cpus / 4),
      Math.floor(resources.memoryBytes / (8 * 1024 ** 3)),
    ),
  )
}

export async function recordComputerHello(
  db: D1Database,
  owner: ComputerOwner,
  digest: string,
  hello: Extract<ComputerToWorker, { type: 'hello' }>,
  now: number,
) {
  const { resources } = hello
  const result = await db
    .prepare(
      `UPDATE own_computers SET connected_at = COALESCE(connected_at, ?),
        last_seen_at = MAX(COALESCE(last_seen_at, 0), ?),
        cpus = ?, memory_bytes = ?, system = ?, program_version = ?,
        computer_protocol_version = ?,
        workspace_limit = CASE WHEN connected_at IS NULL THEN ? ELSE workspace_limit END,
        build_requested_at = CASE WHEN connected_at IS NULL THEN ? ELSE build_requested_at END
       WHERE org_id = ? AND id = ? AND token_digest = ? AND removed_at IS NULL`,
    )
    .bind(
      now,
      now,
      resources.cpus,
      resources.memoryBytes,
      resources.system,
      hello.programVersion,
      hello.computerProtocolVersion,
      defaultComputerLimit(resources),
      now,
      owner.orgId,
      owner.computerId,
      digest,
    )
    .run()
  return result.meta.changes === 1
}

export async function recordComputerDisconnect(
  db: D1Database,
  owner: ComputerOwner,
  digest: string,
  now: number,
) {
  await db
    .prepare(
      `UPDATE own_computers SET last_seen_at = MAX(COALESCE(last_seen_at, 0), ?)
       WHERE org_id = ? AND id = ? AND token_digest = ? AND removed_at IS NULL`,
    )
    .bind(now, owner.orgId, owner.computerId, digest)
    .run()
}
