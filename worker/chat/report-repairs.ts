import type { RunnerReportKind } from '../../src/shared/generated/RunnerReportKind'
import type { RunnerReportRefresh } from '../../src/shared/generated/RunnerReportRefresh'
import type { ChatData } from './types'

export interface StoredReportRepair {
  command: RunnerReportRefresh
  cause: { streamId: string; eventNumber: number; revision: number | null }
  state: 'pending' | 'failed'
  sent: boolean
  deliveredTo?: string
  /** An accepted new part one on the cause stream distinguishes a reused revision. */
  replacementRevision: number | null
}

const PREFIX = 'chat:v1:report-repair:'

/** A kind keeps one command identity until a complete replacement is stored. */
export class ReportRepairs {
  private readonly data: ChatData
  private readonly ended:
    ((kind: RunnerReportKind) => Promise<void>) | undefined

  constructor(
    data: ChatData,
    ended?: (kind: RunnerReportKind) => Promise<void>,
  ) {
    this.data = data
    this.ended = ended
  }

  get(kind: RunnerReportKind): Promise<StoredReportRepair | undefined> {
    return this.data.get(`${PREFIX}${kind}`)
  }

  async all(): Promise<StoredReportRepair[]> {
    return [
      ...(
        await this.data.list<StoredReportRepair>({ prefix: PREFIX })
      ).values(),
    ]
  }

  save(repair: StoredReportRepair): Promise<void> {
    return this.data.put(`${PREFIX}${repair.command.kind}`, repair)
  }

  async remove(kind: RunnerReportKind): Promise<void> {
    await this.data.delete(`${PREFIX}${kind}`)
    await this.ended?.(kind)
  }

  async confirmedThrough(streamId: string, cursor: number): Promise<number> {
    for (const repair of await this.all()) {
      if (
        repair.state === 'pending' &&
        !repair.sent &&
        repair.cause.streamId === streamId
      )
        cursor = Math.min(cursor, repair.cause.eventNumber - 1)
    }
    return cursor
  }
}
