import type { SessionLogin } from '../../src/shared/generated/SessionLogin'

export function publicLoginOwner(
  login: SessionLogin | null,
): SessionLogin | null {
  if (!login) return null
  return login.type === 'org'
    ? { type: 'org', orgId: login.orgId }
    : { type: 'personal', userId: login.userId }
}
