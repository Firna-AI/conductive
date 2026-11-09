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
 * The refusal of an operator request: the person signed in is not an operator.
 */
export function isOperatorRefusal(error: ApiError): boolean {
  return error.status === 403 && error.code === 'operator_required'
}

/**
 * The error of a failed operator request. A refusal shows that the person is no
 * longer an operator, so the app takes the section away.
 */
export function operatorFailure(app: AppModel, error: unknown): ApiError {
  const failure = asApiError(error)
  if (isOperatorRefusal(failure)) app.account.refuseOperator()
  return failure
}

/**
 * A value of the operator section that a page reads each time that it opens,
 * and again on Refresh or Try again: the numbers of the Overview, or the page
 * of an org or a user. The value that shows stays until the answer of a new
 * read, so nothing flashes. A failed read drops it, because a count that did
 * not load is not zero. An answer after the page closed changes nothing.
 */
export class OperatorRead<T> {
  private readonly shown = new Store<Loadable<T>>(loading)
  readonly value: Readable<Loadable<T>> = this.shown
  private readonly busy = new Store(false)
  /** A read runs, such as the read of Refresh. */
  readonly reading: Readable<boolean> = this.busy
  private readonly app: AppModel
  private readonly path: string
  private readonly read: (body: unknown) => T
  /** Each open and close counts one up, so an older answer is obsolete. */
  private generation = 0
  private open = false
  private running: Promise<void> | null = null

  constructor(app: AppModel, path: string, read: (body: unknown) => T) {
    this.app = app
    this.path = path
    this.read = read
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
    this.busy.set(true)
    const reading = this.app.services.api
      .get(this.path, this.read)
      .then(
        (value) => {
          if (run === this.generation) this.shown.set(ready(value))
        },
        (error: unknown) => {
          const failure = operatorFailure(this.app, error)
          if (run !== this.generation) return
          this.shown.set({ state: 'failed', error: failure })
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
}
