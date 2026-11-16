import type { ApiError } from './api/client'
import type { AppModel } from './app-model'
import {
  asApiError,
  loading,
  ready,
  Store,
  type Loadable,
  type Readable,
} from './store'

/**
 * A value that a page reads each time that it opens, and again on Refresh
 * or Try again, such as the numbers of the operator Overview or of the
 * Stats tab of the account. The value that shows stays until the answer of
 * a new read, so nothing flashes. A failed read drops it, because a count
 * that did not load is not zero. An answer after the page closed changes
 * nothing. `failure` turns the error of a failed read into the error that
 * the page shows.
 */
export class PageRead<T> {
  private readonly shown = new Store<Loadable<T>>(loading)
  readonly value: Readable<Loadable<T>> = this.shown
  private readonly busy = new Store(false)
  /** A read runs, such as the read of Refresh. */
  readonly reading: Readable<boolean> = this.busy
  private readonly app: AppModel
  private readonly path: string
  private readonly read: (body: unknown) => T
  private readonly failure: (error: unknown) => ApiError
  /** Each open and close counts one up, so an older answer is obsolete. */
  private generation = 0
  /** Each value of a write counts one up, so a read that started before is obsolete. */
  private writes = 0
  private open = false
  private running: Promise<void> | null = null

  constructor(
    app: AppModel,
    path: string,
    read: (body: unknown) => T,
    failure: (error: unknown) => ApiError = asApiError,
  ) {
    this.app = app
    this.path = path
    this.read = read
    this.failure = failure
  }

  /** A page shows the value, so it reads it. The result closes the page. */
  watch(): () => void {
    this.generation += 1
    const run = this.generation
    this.open = true
    this.running = null
    void this.refresh()
    return () => {
      if (run !== this.generation) return
      this.generation += 1
      this.open = false
      this.running = null
      this.busy.set(false)
    }
  }

  /** Reads the value again. A read that runs already counts for this call. */
  refresh(): Promise<void> {
    if (!this.open) return Promise.resolve()
    if (this.running) return this.running
    const run = this.generation
    const writes = this.writes
    const current = () => run === this.generation && writes === this.writes
    this.busy.set(true)
    const reading = this.app.services.api
      .get(this.path, this.read)
      .then(
        (value) => {
          if (current()) this.shown.set(ready(value))
        },
        (error: unknown) => {
          const failure = this.failure(error)
          if (current()) this.shown.set({ state: 'failed', error: failure })
        },
      )
      .finally(() => {
        if (run !== this.generation) return
        this.running = null
        this.busy.set(false)
      })
    this.running = reading
    return reading
  }

  /**
   * Shows the value that the reply of a write gave, such as the pause
   * after Pause sign-ups. The answer of a read that started before it
   * changes nothing.
   */
  put(value: T): void {
    this.writes += 1
    this.shown.set(ready(value))
  }
}
