import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { ChatStore } from './store'
import type { ChatDependencies } from './types'

export interface TurnEndReport {
  turnId: string
  occurredAt: number
}

type CommittedTurnEnd = TurnEndReport & { workspaceId: string }

export class TurnEndReports {
  private readonly pending: CommittedTurnEnd[] = []
  private readonly report: (report: CommittedTurnEnd) => Promise<void>

  constructor(report: TurnEndReports['report']) {
    this.report = report
  }

  committed(workspaceId: string, reports: readonly TurnEndReport[]): void {
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
