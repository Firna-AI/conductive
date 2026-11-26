import {
  QUEUE_FIX_REPORT_ALARM,
  QUEUE_FIX_OUTBOX,
  type ReadyQueueFix,
} from '../chat/queue-fix-records'
import type { AppEnv } from '../env'
import { scheduleWorkspaceAlarm } from '../features/alarms'
import { requireFeatureResult } from '../features/result'
import type { ReceiverStorage } from '../members/receiver-storage'
import { warnWorker } from '../warnings'
import { queueObject } from './wake'

/** Send committed results with no workspace lock held during the RPC. */
export async function reportQueueFixes(
  env: AppEnv,
  storage: ReceiverStorage,
): Promise<void> {
  try {
    const reports = await storage.list<ReadyQueueFix>({
      prefix: QUEUE_FIX_OUTBOX,
    })
    for (const [key, { scope, ...result }] of reports) {
      requireFeatureResult(
        await queueObject(env, scope).reportMergeQueueFix(scope, result),
      )
      await storage.delete(key)
    }
  } catch {
    warnWorker({ kind: 'merge_queue_report_failed' })
  }
  // A turn can end while an earlier report is in flight.
  await storage.transaction(async (transaction) => {
    const pending = await transaction.list({
      prefix: QUEUE_FIX_OUTBOX,
      limit: 1,
    })
    if (pending.size) return
    await transaction.delete(QUEUE_FIX_REPORT_ALARM)
    await scheduleWorkspaceAlarm(transaction)
  })
}
