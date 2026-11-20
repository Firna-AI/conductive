import type { WorkspaceEventEnvelope } from './workspace-events'
import type { ChatStore } from './store'
import type { ChatDependencies } from './types'
import { warnWorker } from '../warnings'
import { WarningId, type WarningTurnEndState } from '../warning-values'
import {
  runnerWarningFields,
  type RunnerDiagnosticIdentity,
} from './runner-diagnostics'

export interface TurnEndReport {
  turnId: string
  occurredAt: number
  stateWithoutStop?: WarningTurnEndState
}

type CommittedTurnEnd = TurnEndReport & { workspaceId: string }

export class TurnEndReports {
  private readonly pending: CommittedTurnEnd[] = []
  private readonly report: (report: CommittedTurnEnd) => Promise<void>
  private readonly runner: () => RunnerDiagnosticIdentity | null

  constructor(
    report: TurnEndReports['report'],
    runner: TurnEndReports['runner'],
  ) {
    this.report = report
    this.runner = runner
  }

  committed(workspaceId: string, reports: readonly TurnEndReport[]): void {
    for (const report of reports)
      if (report.stateWithoutStop)
        warnWorker({
          kind: 'turn_ended_without_stop_request',
          ...runnerWarningFields(workspaceId, this.runner()),
          turnId: WarningId.checked(report.turnId),
          state: report.stateWithoutStop,
        })
    this.pending.push(...reports.map((report) => ({ ...report, workspaceId })))
  }

  /** The caller holds the queue, after any runner confirmation. Recovery repairs a failed report. */
  async flush(): Promise<void> {
    for (let next = this.pending.shift(); next; next = this.pending.shift())
      await this.report(next)
  }
}
export function reportTurnEnd(
  store: ChatStore,
  dependencies: ChatDependencies,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  { workspaceId, turnId, occurredAt }: CommittedTurnEnd,
): Promise<void> {
  return dependencies.turnEnded(
    workspaceId,
    turnId,
    async (event, at) => {
      await store.change(
        workspaceId,
        (transaction) => transaction.emit(event, at),
        publish,
      )
    },
    occurredAt,
  )
}
