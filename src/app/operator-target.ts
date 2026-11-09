import { readLift, readPendingStops } from './api/read-operator-pages'
import type { AppModel } from './app-model'
import { operatorFailure, OperatorRead } from './operator-read'
import { Store, type Readable } from './store'

/** The addresses of the API for one org or one user. */
export interface TargetPaths {
  /** The page of the target. */
  page: string
  /** The suspension of the target: POST suspends, and DELETE lifts. */
  suspension: string
}

/**
 * The page of one org or one user for the operator, with Suspend and Lift.
 * Each write sends `{}`, as the gate of the app asks, and the page reads the
 * target again after it. A failed write throws its error, so the question shows
 * it and stays open.
 */
export class OperatorTarget<Detail> {
  readonly detail: OperatorRead<Detail>
  private readonly pending = new Store<number | null>(null)
  /**
   * The cloud computers whose stop had not finished in the reply of the last
   * suspension on this page, or `null` without one.
   */
  readonly stopping: Readable<number | null> = this.pending
  private readonly app: AppModel
  private readonly paths: TargetPaths
  /** The target is the account of the person signed in. */
  private readonly self: boolean

  constructor(
    app: AppModel,
    paths: TargetPaths,
    read: (body: unknown) => Detail,
    self = false,
  ) {
    this.app = app
    this.paths = paths
    this.self = self
    this.detail = new OperatorRead(app, paths.page, read)
  }

  /**
   * Suspends the target. A suspension of the operator's own account ends every
   * session of the operator, so the app shows the sign-in.
   */
  async suspend(): Promise<void> {
    let stops: number
    try {
      stops = await this.app.services.api.send(
        'POST',
        this.paths.suspension,
        {},
        readPendingStops,
      )
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    if (this.self) {
      this.app.boot.set({ state: 'signed-out' })
      return
    }
    this.pending.set(stops)
    await this.detail.refresh()
  }

  /** Lifts the suspension of the target. */
  async lift(): Promise<void> {
    try {
      await this.app.services.api.send(
        'DELETE',
        this.paths.suspension,
        {},
        readLift,
      )
    } catch (error) {
      throw operatorFailure(this.app, error)
    }
    this.pending.set(null)
    await this.detail.refresh()
  }
}
