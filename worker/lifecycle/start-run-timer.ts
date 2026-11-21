import type { QueueTurn } from '../chat/queue-turn'

/** A poll is a command status read. Every other provider call is a provider call. */
export type TimedCallKind = 'provider' | 'poll' | 'd1'

export interface StartRunTotals {
  queueWaitMs: number
  queueRewaitMs: number
  providerCalls: number
  providerMs: number
  pollCalls: number
  pollMs: number
  d1Calls: number
  d1Ms: number
  slowestCall: string | null
  slowestMs: number | null
}

/** A provider call of a start run that moves its computer steps. */
export interface ComputerMark {
  kind: 'request-started' | 'request-ended' | 'ready'
  at: number
}

interface OpenRun {
  totals: StartRunTotals
  marks: ComputerMark[] | null
}

/**
 * Measures the open run of a start in one workspace object. The Worker has
 * no async context, so the object times each call of its own D1 binding and
 * providers while a run is open. A call of another queue turn during an
 * outside call of the run also counts in the run. Calls while no run is open
 * count nowhere.
 */
export class StartRunTimer {
  private readonly now: () => number
  private open: OpenRun | undefined
  private queueWaitMs = 0

  constructor(now: () => number) {
    this.now = now
  }

  /** Wraps a queue operation, so that the next run gets its wait for the queue. */
  queued<T>(
    operation: (turn: QueueTurn) => Promise<T>,
  ): (turn: QueueTurn) => Promise<T> {
    const queuedAt = this.now()
    return (turn) => {
      this.queueWaitMs = Math.max(0, this.now() - queuedAt)
      return operation(turn)
    }
  }

  /** Opens a run. Only a run with `computer` keeps computer marks. */
  begin(computer: boolean): void {
    this.open = {
      totals: {
        queueWaitMs: this.queueWaitMs,
        queueRewaitMs: 0,
        providerCalls: 0,
        providerMs: 0,
        pollCalls: 0,
        pollMs: 0,
        d1Calls: 0,
        d1Ms: 0,
        slowestCall: null,
        slowestMs: null,
      },
      marks: computer ? [] : null,
    }
    this.queueWaitMs = 0
  }

  /** A lifecycle run that records nothing drops its queue wait. */
  discard(): void {
    this.open = undefined
    this.queueWaitMs = 0
  }

  /** Closes the open run. Its marks still wait for a storage write. */
  end(): { totals: StartRunTotals; marks: ComputerMark[] } | undefined {
    const run = this.open
    this.open = undefined
    return run && { totals: run.totals, marks: run.marks ?? [] }
  }

  /** Takes the marks that an outside call left for a write in the queue. */
  takeMarks(): ComputerMark[] {
    return this.open?.marks?.splice(0) ?? []
  }

  /** Leaves the queue for a call, and counts the wait to enter it again. */
  async outside<T>(turn: QueueTurn, call: () => Promise<T>): Promise<T> {
    const run = this.open
    let endedAt: number | undefined
    try {
      return await turn.outside(async () => {
        try {
          return await call()
        } finally {
          endedAt = this.now()
        }
      })
    } finally {
      if (run && run === this.open && endedAt !== undefined)
        run.totals.queueRewaitMs += Math.max(0, this.now() - endedAt)
    }
  }

  async time<T>(
    kind: TimedCallKind,
    name: string,
    call: () => Promise<T>,
  ): Promise<T> {
    const run = this.open
    if (!run) return call()
    const startedAt = this.now()
    try {
      return await call()
    } finally {
      if (run === this.open)
        count(run.totals, kind, name, Math.max(0, this.now() - startedAt))
    }
  }

  mark(kind: ComputerMark['kind']): void {
    this.open?.marks?.push({ kind, at: this.now() })
  }
}

function count(
  totals: StartRunTotals,
  kind: TimedCallKind,
  name: string,
  ms: number,
): void {
  if (kind === 'd1') {
    totals.d1Calls += 1
    totals.d1Ms += ms
  } else if (kind === 'poll') {
    totals.pollCalls += 1
    totals.pollMs += ms
  } else {
    totals.providerCalls += 1
    totals.providerMs += ms
  }
  if (totals.slowestMs === null || ms > totals.slowestMs) {
    totals.slowestCall = name
    totals.slowestMs = ms
  }
}
