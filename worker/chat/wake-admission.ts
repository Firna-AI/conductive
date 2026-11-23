import type { Session } from '../../src/shared/generated/Session'
import type { WakeUpFailure } from '../../src/shared/generated/WakeUpFailure'
import type { User } from '../../src/shared/api'
import { readUser } from '../data/users'
import type { AppEnv } from '../env'
import { memberSender } from '../tools/store'
import { SenderAccessDenied } from './login-access'
import type { ChatOperation } from './operation'
import { findChatWorkspace } from './queries'

interface WakeOrigin {
  orgId: string
  sessionId: string
  senderUserId: string
}

type WakeAdmission =
  { kind: 'admitted'; session: Session; user: User } | WakeUpFailure

/** The caller holds the chat queue. A running turn keeps its sender. */
export async function admitWake(
  operation: ChatOperation,
  origin: WakeOrigin,
  env: AppEnv,
  senderId?: string,
): Promise<WakeAdmission> {
  const workspace = await findChatWorkspace(
    env.DB,
    origin.orgId,
    operation.workspaceId,
  )
  if (!workspace || workspace.archivedAt !== null) return { kind: 'archived' }
  const source = await operation.read((view) => view.session(origin.sessionId))
  if (!source || source.closedAt !== null) return { kind: 'session-closed' }
  const activeTurnId = source.activeTurnId
  const active = activeTurnId
    ? await operation.read((view) => view.turn(activeTurnId))
    : undefined
  const selectedSender =
    senderId ??
    (active?.state === 'running' ? active.senderId : origin.senderUserId)
  const member = await memberSender(env.DB, origin.orgId, selectedSender)
  const user = member ? await readUser(env.DB, selectedSender) : null
  if (!user) return { kind: 'sender-unavailable' }
  try {
    const observed = await operation.logins.observe(
      source.id,
      undefined,
      user.id,
    )
    if (observed.login)
      return { kind: 'admitted', session: observed.session, user }
    if (observed.session.loginAvailable && !observed.session.loginShared)
      return { kind: 'login-not-shared' }
    return {
      kind: 'login-unavailable',
      agent: source.choice.agent,
      owner: observed.owner ?? source.login ?? null,
    }
  } catch (error) {
    if (error instanceof SenderAccessDenied)
      return { kind: 'sender-unavailable' }
    throw error
  }
}
