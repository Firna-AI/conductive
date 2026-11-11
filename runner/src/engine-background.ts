/** Two hours from the first wait, including model work after a wake-up. */
const BACKGROUND_WORK_LIMIT_MS = 120 * 60 * 1000

/** One turn's clock survives provider handoffs. Provider levels do not. */
export class BackgroundWait {
  private live = false
  private idle = false
  private observed = false
  private replied = false
  private deadline: number | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly now: () => number
  private readonly expire: () => void
  private readonly limitMs: number
  waiting = false

  constructor(
    now: () => number,
    expire: () => void,
    limitMs = BACKGROUND_WORK_LIMIT_MS,
  ) {
    this.now = now
    this.expire = expire
    this.limitMs = limitMs
  }

  work(live: boolean, idle: boolean): boolean {
    this.live = live
    this.idle = idle
    this.observed ||= live
    return this.replied && idle && !live
  }

  activity(idle: boolean): boolean {
    this.idle = idle
    if (!idle) {
      this.waiting = false
      this.replied = false
    }
    return this.replied && idle && !this.live
  }

  input(receivedAt: number): void {
    if (this.waiting && this.deadline !== null) {
      this.deadline = receivedAt + this.limitMs
      this.arm()
    }
    this.waiting = false
    this.replied = false
    this.idle = false
  }

  reply(): 'finish' | 'wait' | 'limit' {
    if (this.elapsed()) return 'limit'
    this.replied = true
    if (this.live) {
      this.waiting = true
      this.deadline ??= this.now() + this.limitMs
      this.arm()
      return 'wait'
    }
    if (this.observed && !this.idle) return 'wait'
    return 'finish'
  }

  shouldExpire(): boolean {
    return this.waiting && this.elapsed()
  }

  restart(): void {
    this.live = false
    this.idle = false
    this.observed = false
    this.replied = false
    this.waiting = false
  }

  close(): void {
    clearTimeout(this.timer)
    this.timer = undefined
  }

  private elapsed(): boolean {
    return this.deadline !== null && this.now() >= this.deadline
  }

  private arm(): void {
    this.close()
    if (this.deadline === null) return
    this.timer = setTimeout(
      () => {
        this.timer = undefined
        if (!this.elapsed()) this.arm()
        else this.expire()
      },
      Math.max(0, this.deadline - this.now()),
    )
  }
}
