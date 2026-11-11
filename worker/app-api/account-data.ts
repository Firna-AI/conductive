import {
  defaultAgentLoginNoReuse,
  type AgentLoginStatus,
  type NewWorkspaceView,
  type SaveAgentLoginRequest,
} from '../../src/shared/account'
import type { Agent, AgentChoice } from '../../src/shared/agents'

type ConnectedLogin = Extract<AgentLoginStatus, { connected: true }>

export async function accountLogins(
  db: D1Database,
  userId: string,
): Promise<AgentLoginStatus[]> {
  const { results } = await db
    .prepare(
      `SELECT agent, kind, no_reuse AS noReuse, updated_at AS updatedAt, failure_cause AS unusableCause FROM agent_logins
       WHERE user_id = ? ORDER BY agent`,
    )
    .bind(userId)
    .all<
      Omit<ConnectedLogin, 'connected' | 'noReuse'> & {
        noReuse: number
        unusableCause: string | null
      }
    >()
  return (['claude', 'codex'] as const).map((agent): AgentLoginStatus => {
    const login = results.find((item) => item.agent === agent)
    if (!login) return { agent, connected: false }
    const { unusableCause, ...metadata } = login
    return {
      ...metadata,
      connected: true,
      noReuse: login.noReuse === 1,
      ...(agent === 'codex' && unusableCause !== null ? { unusableCause } : {}),
    }
  })
}

export function accountDefault(
  db: D1Database,
  userId: string,
): Promise<AgentChoice | null> {
  return db
    .prepare(
      `SELECT default_agent AS agent, default_model AS model, default_effort AS effort
       FROM user_preferences WHERE user_id = ? AND default_agent IS NOT NULL`,
    )
    .bind(userId)
    .first<AgentChoice>()
}

export async function accountNewWorkspaceView(
  db: D1Database,
  userId: string,
): Promise<NewWorkspaceView> {
  const row = await db
    .prepare(
      'SELECT new_workspace_view AS view FROM user_preferences WHERE user_id = ?',
    )
    .bind(userId)
    .first<{ view: NewWorkspaceView | null }>()
  return row?.view ?? 'page'
}

export async function saveAccountNewWorkspaceView(
  db: D1Database,
  userId: string,
  view: NewWorkspaceView,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_preferences (user_id, new_workspace_view, updated_at)
       VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
       new_workspace_view = excluded.new_workspace_view, updated_at = excluded.updated_at`,
    )
    .bind(userId, view, now)
    .run()
}

export async function saveAccountDefault(
  db: D1Database,
  userId: string,
  choice: AgentChoice,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_preferences (user_id, default_agent, default_model, default_effort, updated_at)
       VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
       default_agent = excluded.default_agent, default_model = excluded.default_model,
       default_effort = excluded.default_effort, updated_at = excluded.updated_at`,
    )
    .bind(userId, choice.agent, choice.model, choice.effort, now)
    .run()
}

export async function saveAccountLogin(
  db: D1Database,
  userId: string,
  agent: Agent,
  kind: SaveAgentLoginRequest['kind'],
  ciphertext: string,
  now: number,
): Promise<boolean> {
  const noReuse = await db
    .prepare(
      `INSERT INTO agent_logins (user_id, agent, kind, ciphertext, no_reuse, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, agent) DO UPDATE SET
       kind = excluded.kind, ciphertext = excluded.ciphertext,
       no_reuse = CASE WHEN agent_logins.kind = excluded.kind
         THEN agent_logins.no_reuse ELSE excluded.no_reuse END,
       updated_at = excluded.updated_at, refresh_claim = NULL,
       refresh_claim_until = NULL, failure_cause = NULL RETURNING no_reuse`,
    )
    .bind(
      userId,
      agent,
      kind,
      ciphertext,
      defaultAgentLoginNoReuse(agent, kind) ? 1 : 0,
      now,
      now,
    )
    .first<number>('no_reuse')
  return noReuse === 1
}

export async function updateAccountLoginReuse(
  db: D1Database,
  userId: string,
  agent: Agent,
  noReuse: boolean,
): Promise<AgentLoginStatus> {
  await db
    .prepare(
      'UPDATE agent_logins SET no_reuse = ? WHERE user_id = ? AND agent = ?',
    )
    .bind(noReuse ? 1 : 0, userId, agent)
    .run()
  return (
    (await accountLogins(db, userId)).find(
      (login) => login.agent === agent,
    ) ?? { agent, connected: false }
  )
}

export async function removeAccountLogin(
  db: D1Database,
  userId: string,
  agent: Agent,
): Promise<void> {
  await db
    .prepare('DELETE FROM agent_logins WHERE user_id = ? AND agent = ?')
    .bind(userId, agent)
    .run()
}
