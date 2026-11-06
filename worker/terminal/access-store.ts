import type { BrowserIdentity } from '../chat/types'

export interface TerminalIdentity extends BrowserIdentity {
  sandboxId: string
}

/** One snapshot covers sessions, membership, ownership, and running sandbox identity. */
export async function readTerminalAccess(
  db: D1Database,
  identities: readonly TerminalIdentity[],
  now: number,
) {
  const { results } = await db
    .prepare(
      `WITH requested AS (
      SELECT CAST(key AS INTEGER) AS connectionNumber,
      json_extract(value,'$.sessionId') AS sessionId, json_extract(value,'$.userId') AS userId,
      json_extract(value,'$.orgId') AS orgId, json_extract(value,'$.workspaceId') AS workspaceId,
      json_extract(value,'$.sandboxId') AS sandboxId FROM json_each(?)
    ) SELECT requested.connectionNumber, sessions.expires_at AS expiresAt FROM requested
    JOIN sessions ON sessions.id = requested.sessionId AND sessions.user_id = requested.userId AND sessions.expires_at > ?
    JOIN org_members m ON m.org_id = requested.orgId AND m.user_id = requested.userId
    JOIN orgs o ON o.id = m.org_id AND o.deleted_at IS NULL
    JOIN workspaces w ON w.org_id = o.id AND w.id = requested.workspaceId
      AND w.sandbox_id = requested.sandboxId AND w.archived_at IS NULL
      AND w.state IN ('ready','working','unread','input')`,
    )
    .bind(JSON.stringify(identities), now)
    .all<{ connectionNumber: number; expiresAt: number }>()
  return results
}
