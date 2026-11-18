import type { Agent } from '../../src/shared/generated/Agent'
import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import type { AppEnv } from '../env'
import {
  readLoginAccess,
  type LoginAccess,
  type LoginScope,
} from './login-access-data'

/** The sole default order for sessions, tools, account reads, and runs. */
export function defaultLogin(
  access: LoginAccess | undefined,
  excluded?: SessionLogin,
): SessionLogin | null {
  if (!access?.senderAllowed) return null
  const same = (login: SessionLogin) =>
    excluded?.type === login.type &&
    (login.type === 'org'
      ? excluded.type === 'org' && login.orgId === excluded.orgId
      : excluded.type === 'personal' && login.userId === excluded.userId)
  const personal =
    access.personal?.available && !same(access.personal.login)
      ? access.personal.login
      : null
  const org =
    access.org?.available && !same(access.org.login) ? access.org.login : null
  if (access.useForEveryMember && org) return org
  return personal ?? org
}

export async function resolveDefaultLogin(
  env: AppEnv,
  scope: LoginScope,
  userId: string,
  agent: Agent,
  excluded?: SessionLogin,
): Promise<SessionLogin | null> {
  const access = await readLoginAccess(
    env,
    scope,
    [{ sessionId: 'default', userId, agent }],
    { senderId: userId },
  )
  return defaultLogin(access.get('default'), excluded)
}
