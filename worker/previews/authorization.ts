interface WaitingCheck {
  resolve: () => void
  reject: (error: unknown) => void
}

/** How long one successful access read covers the later checks of its viewer. */
export const PREVIEW_ACCESS_WINDOW_MS = 1_000

/**
 * Only waiters captured before a read starts can use that read.
 * A successful read also covers each check that starts within `windowMs` after the read started.
 * A window of 0 caches no grant.
 */
export class AuthorizationBatch {
  private readonly read: () => Promise<void>
  private readonly windowMs: number
  private readonly now: () => number
  private waiting: WaitingCheck[] = []
  private running = false
  private freshUntil = Number.NEGATIVE_INFINITY

  constructor(
    read: () => Promise<void>,
    options: { windowMs?: number; now?: () => number } = {},
  ) {
    this.read = read
    this.windowMs = options.windowMs ?? 0
    this.now = options.now ?? Date.now
  }

  check(): Promise<void> {
    if (this.windowMs > 0 && this.now() < this.freshUntil)
      return Promise.resolve()
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

  /** Ends the window, so the next check reads again. */
  expire(): void {
    this.freshUntil = Number.NEGATIVE_INFINITY
  }

  private async drain(): Promise<void> {
    while (this.waiting.length) {
      const batch = this.waiting
      this.waiting = []
      const started = this.now()
      try {
        await this.read()
        this.freshUntil = started + this.windowMs
        for (const waiter of batch) waiter.resolve()
      } catch (error) {
        this.freshUntil = Number.NEGATIVE_INFINITY
        for (const waiter of batch) waiter.reject(error)
      }
    }
    this.running = false
  }
}
