import type { Resource } from './resource'
import type { AppServices } from './services'
import { valueOf } from './store'

/** The wait before the next read of a shown value, in ms, or `null` for none. */
export type RefreshWait<T> = (value: T | undefined) => number | null

/** The reads of a value that screens show. */
export interface Refreshing {
  /** A screen shows the value. The result says that it no longer does. */
  watch(): () => void
  /** Reads the value now. A read that runs already counts for this call. */
  refresh(): Promise<void>
}

/**
 * The reads of one value while screens show it. The first screen reads it
 * at once, and so does each return of the user to the page. A timer reads
 * it again after the wait of the current value. The last screen to leave
 * stops the timer and the focus listener. Screens share one read.
 */
export class Refresher<T> implements Refreshing {
  private screens = 0
  private running: Promise<void> | null = null
  private cancelTimer: (() => void) | null = null
  private timerWait: number | null = null
  private stops: (() => void)[] = []
  private readonly resource: Resource<T>
  private readonly wait: RefreshWait<T>
  private readonly services: Pick<AppServices, 'delay' | 'onFocus'>

  constructor(
    resource: Resource<T>,
    wait: RefreshWait<T>,
    services: Pick<AppServices, 'delay' | 'onFocus'>,
  ) {
    this.resource = resource
    this.wait = wait
    this.services = services
  }

  watch(): () => void {
    this.screens += 1
    if (this.screens === 1) {
      this.stops = [
        this.services.onFocus(() => void this.refresh()),
        this.resource.store.subscribe(() => this.follow()),
      ]
      void this.refresh()
    }
    let shown = true
    return () => {
      if (!shown) return
      shown = false
      this.screens -= 1
      if (this.screens === 0) this.halt()
    }
  }

  refresh(): Promise<void> {
    if (this.running) return this.running
    this.clearTimer()
    const run = this.resource.read().finally(() => {
      this.running = null
      this.schedule()
    })
    this.running = run
    return run
  }

  /**
   * Reads the value with a read that starts after this call, such as after
   * a refusal that the value may no longer exist. A read that runs already
   * may have started before that, so the new read starts after its answer.
   */
  async reread(): Promise<void> {
    if (this.running) await this.running
    return this.refresh()
  }

  /** A change of the value can change the wait, such as a row that starts. */
  private follow(): void {
    if (this.running || this.screens === 0) return
    if (this.wanted() !== this.timerWait) this.schedule()
  }

  private wanted(): number | null {
    return this.wait(valueOf(this.resource.store.get()))
  }

  private schedule(): void {
    this.clearTimer()
    if (this.screens === 0) return
    const wait = this.wanted()
    if (wait === null) return
    this.timerWait = wait
    this.cancelTimer = this.services.delay(wait, () => {
      this.cancelTimer = null
      this.timerWait = null
      return this.refresh()
    })
  }

  private clearTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
    this.timerWait = null
  }

  private halt(): void {
    this.clearTimer()
    for (const stop of this.stops.splice(0)) stop()
  }
}
