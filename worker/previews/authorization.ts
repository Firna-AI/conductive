interface WaitingCheck {
  resolve: () => void
  reject: (error: unknown) => void
}

/** Only waiters captured before a read starts can use that read. No grant is cached. */
export class AuthorizationBatch {
  private readonly read: () => Promise<void>
  private waiting: WaitingCheck[] = []
  private running = false

  constructor(read: () => Promise<void>) {
    this.read = read
  }

  check(): Promise<void> {
    const pending = new Promise<void>((resolve, reject) => {
      this.waiting.push({ resolve, reject })
    })
    if (!this.running) {
      this.running = true
      queueMicrotask(() => {
        void this.drain()
      })
    }
    return pending
  }

  private async drain(): Promise<void> {
    while (this.waiting.length) {
      const batch = this.waiting
      this.waiting = []
      try {
        await this.read()
        for (const waiter of batch) waiter.resolve()
      } catch (error) {
        for (const waiter of batch) waiter.reject(error)
      }
    }
    this.running = false
  }
}
