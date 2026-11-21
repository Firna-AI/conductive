import {
  firstTurnAutomationRun,
  finishAutomationRun,
} from '../automations/run-outcome-data'
import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import type { ChatStore } from './store'
import { automationChainOutcome } from './automation-outcome'

/** The delay of the first retry after a failed report. */
const AUTOMATION_REPORT_RETRY_MS = 30_000

export async function reportAutomationFirstTurn(
  db: D1Database,
  store: ChatStore,
  workspaceId: string,
  now: number,
): Promise<void> {
  const run = await firstTurnAutomationRun(db, workspaceId)
  if (!run) return
  const outcome = await store.read(workspaceId, (view) =>
    automationChainOutcome(view, run.turnId),
  )
  if (outcome)
    await finishAutomationRun(db, run.orgId, run.id, outcome, now, workspaceId)
}

/**
 * The report after each committed chat change. A failed report does not fail
 * the change. It stores the due time of the alarm retry instead. Without a
 * retry alarm, the error goes to the caller, which sends the change again.
 */
export async function reportAfterChatChange(
  report: () => Promise<void>,
  workspaceId: string,
  now: () => number,
  scheduleRetry: ((at: number) => Promise<void>) | undefined,
): Promise<void> {
  try {
    await report()
  } catch (error) {
    if (!scheduleRetry) throw error
    warnWorker({
      kind: 'automation_report_failed',
      workspaceId: WarningId.checked(workspaceId),
      retry: 'scheduled',
      error: errorSummary(error),
    })
    await scheduleRetry(now() + AUTOMATION_REPORT_RETRY_MS)
  }
}

/**
 * The alarm retry of a failed report. It throws after a failure, so that the
 * alarm keeps its due time, and the end of the alarm run moves it later.
 */
export async function retryAutomationReport(
  db: D1Database,
  store: ChatStore,
  now: () => number,
): Promise<void> {
  const workspaceId = await store.workspaceId()
  if (!workspaceId) return
  try {
    await reportAutomationFirstTurn(db, store, workspaceId, now())
  } catch (error) {
    warnWorker({
      kind: 'automation_report_failed',
      workspaceId: WarningId.checked(workspaceId),
      retry: 'alarm',
      error: errorSummary(error),
    })
    throw error
  }
}
