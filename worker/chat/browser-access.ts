import type { BrowserIdentity, ChatScheduler } from './types'

/** One query checks the complete authenticated connection snapshot. */
export async function readBrowserAccess(
  db: Pick<D1Database, 'prepare'>,
  tabs: readonly BrowserIdentity[],
  now: number,
): Promise<readonly number[]> {
  const result = await db
    .prepare(
      `WITH requested AS (
       SELECT CAST(key AS INTEGER) AS peerNumber,
         json_extract(value, '$.sessionId') AS sessionId,
         json_extract(value, '$.userId') AS userId,
         json_extract(value, '$.orgId') AS orgId,
         json_extract(value, '$.workspaceId') AS workspaceId
       FROM json_each(?)
     )
     SELECT requested.peerNumber FROM requested
     JOIN sessions ON sessions.id = requested.sessionId AND sessions.user_id = requested.userId AND sessions.expires_at > ?
     JOIN org_members ON org_members.user_id = requested.userId AND org_members.org_id = requested.orgId
     JOIN orgs ON orgs.id = requested.orgId AND orgs.deleted_at IS NULL
     JOIN workspaces ON workspaces.id = requested.workspaceId AND workspaces.org_id = requested.orgId`,
    )
    .bind(JSON.stringify(tabs), now)
    .all<{ peerNumber: number }>()
  return result.results.map(({ peerNumber }) => peerNumber)
}

export const scheduleBrowserCheck: ChatScheduler = (work, delayMs) => {
  const timer = setTimeout(() => {
    void work()
  }, delayMs)
  return () => clearTimeout(timer)
}
