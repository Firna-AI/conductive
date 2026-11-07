import { sandboxAccessPredicate } from '../data/sandbox-access'

interface ConnectionSessionIdentity {
  sessionId: string
  userId: string
  orgId: string
  workspaceId: string
}

export interface SandboxConnectionIdentity extends ConnectionSessionIdentity {
  kind: 'sandbox'
  sandboxId: string
}

export type ConnectionIdentity =
  | (ConnectionSessionIdentity & { kind: 'workspace' })
  | SandboxConnectionIdentity

export interface ConnectionGrant {
  connectionNumber: number
  deadline: number
}

export type ConnectionScheduler = (
  work: () => Promise<void>,
  delayMs: number,
) => () => void

export const CONNECTION_CHECK_MS = 15_000
const GRANT_MS = 30_000

/** One snapshot checks every connection. A delayed read cannot extend its grant. */
export async function readConnectionAccess(
  db: Pick<D1Database, 'prepare'>,
  identities: readonly ConnectionIdentity[],
  now: number,
): Promise<readonly ConnectionGrant[]> {
  const { results } = await db
    .prepare(
      `WITH requested AS (
       SELECT CAST(key AS INTEGER) AS connectionNumber,
         json_extract(value, '$.kind') AS kind,
         json_extract(value, '$.sessionId') AS sessionId,
         json_extract(value, '$.userId') AS userId,
         json_extract(value, '$.orgId') AS orgId,
         json_extract(value, '$.workspaceId') AS workspaceId,
         json_extract(value, '$.sandboxId') AS sandboxId
       FROM json_each(?)
     )
     SELECT requested.connectionNumber, sessions.expires_at AS expiresAt FROM requested
     JOIN sessions ON sessions.id = requested.sessionId AND sessions.user_id = requested.userId
       AND sessions.expires_at > ?
     JOIN users u ON u.id = requested.userId AND u.suspended_at IS NULL
     JOIN org_members m ON m.org_id = requested.orgId AND m.user_id = requested.userId
     JOIN orgs o ON o.id = m.org_id AND o.deleted_at IS NULL
     JOIN workspaces w ON w.org_id = o.id AND w.id = requested.workspaceId
     WHERE requested.kind = 'workspace' OR (
       requested.kind = 'sandbox' AND w.sandbox_id = requested.sandboxId
       AND ${sandboxAccessPredicate}
     )`,
    )
    .bind(JSON.stringify(identities), now)
    .all<{ connectionNumber: number; expiresAt: number }>()
  return results.map(({ connectionNumber, expiresAt }) => ({
    connectionNumber,
    deadline: Math.min(now + GRANT_MS, expiresAt),
  }))
}

export const scheduleConnectionCheck: ConnectionScheduler = (work, delayMs) => {
  const timer = setTimeout(() => {
    void work()
  }, delayMs)
  return () => clearTimeout(timer)
}
