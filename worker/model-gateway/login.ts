import type { Agent } from '../../src/shared/agents'
import { agentLoginKind } from '../chat/login-kind'
import {
  agentLoginContext,
  loginSecret,
  senderLoginAccess,
} from '../chat/queries'
import type { AppEnv } from '../env'
import { decrypt } from '../security/crypto'

export async function gatewayLogin(
  env: AppEnv,
  workspaceId: string,
  starterId: string | null,
  agent: Agent,
) {
  const access = await senderLoginAccess(env.DB, workspaceId, starterId, agent)
  if (!starterId || !access.loginOwnerAllowed) return null
  const row = await env.DB.prepare(
    `SELECT l.kind, l.ciphertext, l.updated_at AS updatedAt
     FROM agent_logins l JOIN workspaces w ON w.id = ?
     WHERE l.user_id = ? AND l.agent = ?
       AND w.state NOT IN ('stopped', 'archived', 'error')`,
  )
    .bind(workspaceId, starterId, agent)
    .first<{ kind: string; ciphertext: string; updatedAt: number }>()
  const kind = row ? agentLoginKind(agent, row.kind) : null
  return row && kind ? { ...row, loginKind: kind, userId: starterId } : null
}

export async function decryptGatewayLogin(
  env: AppEnv,
  row: NonNullable<Awaited<ReturnType<typeof gatewayLogin>>>,
) {
  const secret = loginSecret(
    await decrypt(
      row.ciphertext,
      agentLoginContext(row.userId, row.loginKind.agent),
      env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  return { ...row.loginKind, secret }
}
