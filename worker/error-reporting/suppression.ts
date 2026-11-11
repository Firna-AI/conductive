export class WorkerErrorLimiter {
  private readonly sent = new Map<string, number>()
  private readonly recent: number[] = []
  private readonly now: () => number

  constructor(now: () => number) {
    this.now = now
  }

  get size(): number {
    return this.sent.size
  }

  admit(key: string): boolean {
    const now = this.now()
    const last = this.sent.get(key)
    if (last !== undefined && now - last < 60_000) return false
    while (this.recent.length && this.recent[0] <= now - 60_000)
      this.recent.shift()
    if (this.recent.length >= 60) return false
    this.sent.delete(key)
    if (this.sent.size >= 1024) {
      const oldest = this.sent.keys().next().value
      if (oldest !== undefined) this.sent.delete(oldest)
    }
    this.sent.set(key, now)
    this.recent.push(now)
    return true
  }
}
