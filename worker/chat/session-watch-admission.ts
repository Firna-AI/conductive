import { requireActiveOrg } from '../data/user-access'
import type { AppEnv } from '../env'
import type { ChatOperation } from './operation'
import type { ReadySessionWatch } from './session-watch-records'
import { admitWake } from './wake-admission'

/** The caller holds its queue. A running turn supplies the same sender as a late secret answer. */
export async function watchAdmission(
  operation: ChatOperation,
  watch: ReadySessionWatch,
  env: AppEnv,
  senderId?: string,
) {
  await requireActiveOrg(env.DB, watch.orgId)
  const nonce = await operation.read((view) =>
    view.watches.stopNonce(watch.caller.sessionId),
  )
  if (nonce !== watch.caller.stopNonce) return null
  const admission = await admitWake(
    operation,
    { ...watch.caller, orgId: watch.orgId },
    env,
    senderId,
  )
  return admission.kind === 'admitted' ? admission : null
}
