import type { WakeUpFailure } from '../../src/shared/generated/WakeUpFailure'
import { readUser } from '../data/users'
import type { AppEnv } from '../env'
import { memberSender } from '../tools/store'
import { SenderAccessDenied } from './login-access'
import {
  resolveNoticeDestination,
  type AdmittedNotice,
  type NoticeDestination,
} from './notice-destination'
import type { ChatOperation } from './operation'
import { findChatWorkspace } from './queries'
import type { StoredTurn } from './types'

interface WakeOrigin {
  orgId: string
  sessionId: string
  senderUserId: string
}

type WakeAdmission = ({ kind: 'admitted' } & AdmittedNotice) | WakeUpFailure

/** The caller holds the chat queue. A running turn keeps its sender. */
export async function admitWake(
  operation: ChatOperation,
  origin: WakeOrigin,
  env: AppEnv,
  retryTurn?: Pick<StoredTurn, 'id' | 'senderId'>,
): Promise<WakeAdmission> {
  const workspace = await findChatWorkspace(
    env.DB,
    origin.orgId,
    operation.workspaceId,
  )
  if (!workspace || workspace.archivedAt !== null) return { kind: 'archived' }
  const source = await operation.read((view) => view.session(origin.sessionId))
  if (!source || source.closedAt !== null) return { kind: 'session-closed' }
  const destination: NoticeDestination = retryTurn
    ? { kind: 'existing', turnId: retryTurn.id, senderId: retryTurn.senderId }
    : await operation.read((view) =>
        resolveNoticeDestination(view, source, origin.senderUserId),
      )
  const member = await memberSender(env.DB, origin.orgId, destination.senderId)
  const user = member ? await readUser(env.DB, destination.senderId) : null
  if (!user) return { kind: 'sender-unavailable' }
  try {
    const observed = await operation.logins.observe(
      source.id,
      undefined,
      user.id,
    )
    if (observed.login)
      return { kind: 'admitted', session: observed.session, user, destination }
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
