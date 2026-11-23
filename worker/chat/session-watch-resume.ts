import type { AppEnv } from '../env'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import type { WorkspaceChat } from './backend'
import type { ChatOperation } from './operation'
import type { WatchReceipt } from './session-watch-records'
import { watchAdmission } from './session-watch-admission'
import { resumeWakeDelivery } from './wake-resume'

/** Admission and its final live-work check stay in this caller queue turn. */
export async function resumeSessionWatch(
  chat: WorkspaceChat,
  operation: ChatOperation,
  receipt: Extract<WatchReceipt, { state: 'accepted' }>,
  env: AppEnv,
  controller: WorkspaceController,
  now: () => number,
): Promise<Extract<WatchReceipt, { state: 'accepted' }>['resume']> {
  return resumeWakeDelivery(
    chat,
    operation,
    { messageId: receipt.messageId, orgId: receipt.watch.orgId },
    async (senderId) =>
      Boolean(await watchAdmission(operation, receipt.watch, env, senderId)),
    env,
    controller,
    now,
  )
}
