import type { Session } from '../../src/shared/sessions'

type OptionalSessionFields =
  'startedBy' | 'sourceSessionId' | 'loginAvailable' | 'retryMessageId'
export type StoredSession = Omit<Session, OptionalSessionFields> &
  Partial<Pick<Session, OptionalSessionFields>>

export function normalizeSession(session: StoredSession): Session {
  return {
    ...session,
    retryMessageId: session.retryMessageId ?? null,
    startedBy: session.startedBy ?? null,
    sourceSessionId: session.startedBy
      ? (session.sourceSessionId ?? null)
      : null,
    loginAvailable: session.startedBy
      ? (session.loginAvailable ?? false)
      : false,
  }
}
