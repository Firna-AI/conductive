import type { Agent } from '../../src/shared/agents'
import type { Session } from '../../src/shared/sessions'
import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'
import { agentLoginKind } from './login-kind'

export interface SessionLoginTarget {
  sessionId: string
  userId: string
  agent: Agent
}

export type SessionLoginMetadata = Pick<
  Session,
  'loginAvailable' | 'loginShared'
>

export async function readLoginMetadata(
  db: D1Database,
  workspaceId: string,
  targets: readonly SessionLoginTarget[],
): Promise<ReadonlyMap<string, SessionLoginMetadata>> {
  const rows = await db
    .prepare(
      `WITH requested AS (
       SELECT json_extract(value, '$.sessionId') AS sessionId,
         json_extract(value, '$.userId') AS userId,
         json_extract(value, '$.agent') AS agent
       FROM json_each(?)
     )
     SELECT requested.sessionId, requested.agent, agent_logins.kind,
       agent_logins.no_reuse AS noReuse
     FROM requested
     JOIN workspaces w ON w.id = ? AND ${workspaceTokenResourcePredicate}
     JOIN org_members ON org_members.org_id = w.org_id
       AND org_members.user_id = requested.userId
     JOIN users login_owner ON login_owner.id = org_members.user_id
       AND login_owner.suspended_at IS NULL
     JOIN agent_logins ON agent_logins.user_id = requested.userId
       AND agent_logins.agent = requested.agent AND agent_logins.failure_cause IS NULL`,
    )
    .bind(JSON.stringify(targets), workspaceId)
    .all<{ sessionId: string; agent: Agent; kind: string; noReuse: number }>()
  return new Map<string, SessionLoginMetadata>(
    rows.results
      .filter((row) => agentLoginKind(row.agent, row.kind) !== null)
      .map((row): [string, SessionLoginMetadata] => [
        row.sessionId,
        { loginAvailable: true, loginShared: row.noReuse === 0 },
      ]),
  )
}
