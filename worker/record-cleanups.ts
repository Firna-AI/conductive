import { cleanupFeedbackSends } from './app-api/feedback-quota-data'
import { cleanupCodexDevices } from './codex-auth/device-store'
import { deleteOldJobRecords } from './lifecycle/job-steps'
import { pruneListFacts } from './merge-queue/list-facts-data'
import { runScheduledStep } from './scheduled-step'

/** The record cleanups of the 15-minute cron, in their order. */
export async function runRecordCleanups(
  db: D1Database,
  now: number,
): Promise<void> {
  await runScheduledStep('feedback_send_cleanup_failed', () =>
    cleanupFeedbackSends(db, now),
  )
  await runScheduledStep('codex_device_cleanup_failed', () =>
    cleanupCodexDevices(db, now),
  )
  await runScheduledStep('job_record_cleanup_failed', () =>
    deleteOldJobRecords(db, now),
  )
  await runScheduledStep('merge_queue_list_cleanup_failed', () =>
    pruneListFacts(db, now),
  )
}
