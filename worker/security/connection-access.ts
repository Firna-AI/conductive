import { sandboxAccessPredicate } from '../data/sandbox-access'
import type { PreviewRecord } from '../previews/store'

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

export interface PreviewConnectionIdentity extends ConnectionSessionIdentity {
  kind: 'preview'
  previewId: string
  hostname: string
  expiresAt: number
}

export type ConnectionIdentity =
  | (ConnectionSessionIdentity & { kind: 'workspace' })
  | SandboxConnectionIdentity
  | PreviewConnectionIdentity

export interface ConnectionGrant {
  connectionNumber: number
  deadline: number
  preview?: PreviewRecord
}

interface AccessRow {
  connectionNumber: number
  expiresAt: number
  previewId: string | null
  hostname: string
  orgId: string
  workspaceId: string
  sandboxId: string
  state: PreviewRecord['state']
  port: number
  previewExpiresAt: number
  credentialExpiresAt: number
  listenerMode: PreviewRecord['listenerMode']
  listenerSandboxId: string | null
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
         json_extract(value, '$.sandboxId') AS sandboxId,
         json_extract(value, '$.previewId') AS previewId,
         json_extract(value, '$.hostname') AS hostname,
         json_extract(value, '$.expiresAt') AS expiresAt
       FROM json_each(?)
     )
     SELECT requested.connectionNumber, sessions.expires_at AS expiresAt,
       p.id AS previewId, p.hostname, w.org_id AS orgId, w.id AS workspaceId,
       w.sandbox_id AS sandboxId, w.state, p.port, p.expires_at AS previewExpiresAt,
       requested.expiresAt AS credentialExpiresAt,
       p.listener_mode AS listenerMode, p.listener_sandbox_id AS listenerSandboxId FROM requested
     JOIN sessions ON sessions.id = requested.sessionId AND sessions.user_id = requested.userId
       AND sessions.expires_at > ?
     JOIN users u ON u.id = requested.userId AND u.suspended_at IS NULL
     JOIN org_members m ON m.org_id = requested.orgId AND m.user_id = requested.userId
     JOIN orgs o ON o.id = m.org_id AND o.deleted_at IS NULL
     JOIN workspaces w ON w.org_id = o.id AND w.id = requested.workspaceId
     LEFT JOIN preview_hostnames p ON p.id = requested.previewId
       AND p.hostname = requested.hostname AND p.workspace_id = w.id AND p.org_id = o.id
     WHERE requested.kind = 'workspace' OR (
       requested.kind = 'sandbox' AND w.sandbox_id = requested.sandboxId
       AND ${sandboxAccessPredicate}
     ) OR (
       requested.kind = 'preview'
       AND p.revoked_at IS NULL AND p.expires_at > ?
       AND requested.expiresAt > ? AND requested.expiresAt <= p.expires_at
       AND ${sandboxAccessPredicate}
     )`,
    )
    .bind(JSON.stringify(identities), now, now, now)
    .all<AccessRow>()
  return results.map((row) => ({
    connectionNumber: row.connectionNumber,
    deadline: Math.min(
      now + GRANT_MS,
      row.expiresAt,
      row.previewId ? row.previewExpiresAt : Infinity,
      row.previewId ? row.credentialExpiresAt : Infinity,
    ),
    ...(row.previewId
      ? {
          preview: {
            id: row.previewId,
            hostname: row.hostname,
            orgId: row.orgId,
            workspaceId: row.workspaceId,
            sandboxId: row.sandboxId,
            state: row.state,
            port: row.port,
            expiresAt: row.previewExpiresAt,
            listenerMode: row.listenerMode,
            listenerSandboxId: row.listenerSandboxId,
          },
        }
      : {}),
  }))
}

export const scheduleConnectionCheck: ConnectionScheduler = (work, delayMs) => {
  const timer = setTimeout(() => {
    void work()
  }, delayMs)
  return () => clearTimeout(timer)
}
