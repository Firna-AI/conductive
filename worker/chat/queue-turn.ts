export interface QueueTurn {
  outside<T>(call: () => Promise<T>): Promise<T>
}

function completion() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export class ChatQueue {
  private holding: QueueTurn | undefined
  private outsideTurns = 0
  private tail: Promise<void> = Promise.resolve()
  private readonly pending = new Set<Promise<void>>()
  private settledWork: Promise<void> = Promise.resolve()
  private settle: () => void = () => undefined
  private readonly report: () => Promise<void>

  constructor(report: () => Promise<void> = async () => undefined) {
    this.report = report
  }

  get currentTurn(): QueueTurn | undefined {
    return this.holding
  }

  get hasOutsideTurns(): boolean {
    return this.outsideTurns > 0
  }

  run<T>(work: (turn: QueueTurn) => Promise<T>): Promise<T> {
    const ended = completion()
    if (this.pending.size === 0) {
      const settled = completion()
      this.settledWork = settled.promise
      this.settle = settled.resolve
    }
    this.pending.add(ended.promise)
    let leave: () => void
    const turn: QueueTurn = {
      outside: async (call) => {
        await this.report()
        leave()
        this.outsideTurns++
        try {
          return await call()
        } finally {
          leave = await this.enter(turn, true)
        }
      },
    }
    return (async () => {
      leave = await this.enter(turn)
      try {
        return await work(turn)
      } finally {
        try {
          await this.report()
        } finally {
          leave()
          this.pending.delete(ended.promise)
          ended.resolve()
          if (this.pending.size === 0) this.settle()
        }
      }
    })()
  }

  settled(): Promise<void> {
    return this.settledWork
  }

  idle(): Promise<void> {
    return Promise.all([...this.pending]).then(() => undefined)
  }

  private enter(turn: QueueTurn, returning = false): Promise<() => void> {
    const released = completion()
    const prior = this.tail
    this.tail = prior.then(() => released.promise)
    return prior.then(() => {
      this.holding = turn
      if (returning) this.outsideTurns--
      return () => {
        this.holding = undefined
        released.resolve()
      }
    })
  }
}
