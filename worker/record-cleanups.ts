import { cleanupFeedbackSends } from './app-api/feedback-quota-data'
import { cleanupCodexDevices } from './codex-auth/device-store'
import { cleanupOldJobRecords } from './lifecycle/job-steps'

/** The record cleanups of the 15-minute cron, in their order. */
export async function runRecordCleanups(
  db: D1Database,
  now: number,
): Promise<void> {
  await cleanupFeedbackSends(db, now)
  await cleanupCodexDevices(db, now)
  await cleanupOldJobRecords(db, now)
}
