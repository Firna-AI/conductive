import { readUser } from '../data/users'
import { requireActiveOrg } from '../data/user-access'
import type { AppEnv } from '../env'
import { memberSender } from '../tools/store'
import { SenderAccessDenied } from './login-access'
import type { ChatOperation } from './operation'
import { findChatWorkspace } from './queries'
import type { ReadySessionWatch } from './session-watch-records'

/** The caller holds its queue. A running turn supplies the same sender as a late secret answer. */
export async function watchAdmission(
  operation: ChatOperation,
  watch: ReadySessionWatch,
  env: AppEnv,
  senderId?: string,
) {
  await requireActiveOrg(env.DB, watch.orgId)
  const workspace = await findChatWorkspace(
    env.DB,
    watch.orgId,
    watch.caller.workspaceId,
  )
  if (!workspace || workspace.archivedAt !== null) return null
  const source = await operation.read((view) =>
    view.session(watch.caller.sessionId),
  )
  if (!source || source.closedAt !== null) return null
  const nonce = await operation.read((view) =>
    view.watches.stopNonce(source.id),
  )
  if (nonce !== watch.caller.stopNonce) return null
  const activeTurnId = source.activeTurnId
  const active = activeTurnId
    ? await operation.read((view) => view.turn(activeTurnId))
    : undefined
  const selectedSender =
    senderId ??
    (active?.state === 'running' ? active.senderId : watch.caller.senderUserId)
  const member = await memberSender(env.DB, watch.orgId, selectedSender)
  const user = member ? await readUser(env.DB, selectedSender) : null
  if (!user) return null
  try {
    const observed = await operation.logins.observe(
      source.id,
      undefined,
      user.id,
    )
    return observed.login ? { session: observed.session, user } : null
  } catch (error) {
    if (error instanceof SenderAccessDenied) return null
    throw error
  }
}
