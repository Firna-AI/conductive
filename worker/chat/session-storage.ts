import type { Session } from '../../src/shared/generated/Session'

type OptionalSessionFields =
  | 'login'
  | 'anchor'
  | 'startedBy'
  | 'sourceSessionId'
  | 'loginAvailable'
  | 'loginShared'
  | 'retryMessageId'
  | 'activeTurnStartedAt'
export type StoredSession = Omit<Session, OptionalSessionFields> &
  Partial<Pick<Session, OptionalSessionFields>>

export function normalizeSession(
  session: StoredSession,
  hasMessages = Boolean(session.activeTurnId || session.retryMessageId),
): Session {
  const normalized: Session = {
    ...session,
    ...(session.login
      ? { login: session.login }
      : hasMessages && session.startedBy
        ? { login: { type: 'personal' as const, userId: session.startedBy.id } }
        : {}),
    choice: { ...session.choice, fast: session.choice.fast ?? false },
    activeTurnStartedAt: session.activeTurnId
      ? (session.activeTurnStartedAt ?? null)
      : null,
    retryMessageId: session.retryMessageId ?? null,
    startedBy: session.startedBy ?? null,
    sourceSessionId: session.startedBy
      ? (session.sourceSessionId ?? null)
      : null,
    loginAvailable: session.startedBy
      ? (session.loginAvailable ?? false)
      : false,
    loginShared: session.loginShared ?? true,
  }
  if (normalized.login) delete normalized.defaultLogin
  return normalized
}
