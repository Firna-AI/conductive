import {
  routinePaths,
  type RoutineRun,
  type RoutineRunsResponse,
  type RunRoutineRequest,
} from '../shared/routines'
import type { ApiClient } from './api/client'
import {
  readRoutineRunResponse,
  readRoutineRunsResponse,
} from './api/read-routine-runs'
import type { OrgModel } from './org-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import { ready, Store, type Loadable, type Readable } from './store'

/**
 * How often a shown Runs list reads its runs. The app has no event stream
 * for the runs of a routine, so the page reads them again.
 */
const runsWait = 10_000

/** The runs that the Runs list shows, newest first, and whether older exist. */
export interface ShownRuns {
  runs: readonly RoutineRun[]
  more: boolean
}

/**
 * The runs of one routine, newest first. The list shows a number of pages
 * of 50 runs: one at first, and one more after each Show older runs. While
 * its page shows it, the list reads every 10 seconds and at each return to
 * the page. Each read gets that many pages from the newest run, one after
 * the other, and replaces the whole list. So the list has no gap, and each
 * row shows the state of the last read. When new runs arrive, the oldest
 * rows move behind Show older runs. Each request goes through `client`,
 * the client of the routine page.
 */
export class RoutineRuns {
  readonly shown: Readable<Loadable<ShownRuns>>
  private readonly view = new Store<Loadable<ShownRuns>>({ state: 'loading' })
  /** The runs of the pages that the list shows, and the cursor after them. */
  private readonly window: Resource<RoutineRunsResponse>
  private readonly reads: Refresher<RoutineRunsResponse>
  /** The number of pages that the list shows. */
  private pages = 1
  private readonly org: OrgModel
  private readonly routineId: string
  private readonly client: ApiClient

  constructor(org: OrgModel, routineId: string, client: ApiClient) {
    this.org = org
    this.routineId = routineId
    this.client = client
    this.window = new Resource(() => this.readPages(this.pages))
    this.reads = new Refresher(this.window, () => runsWait, org.services)
    this.shown = this.view
    this.window.store.subscribe(() => this.show())
  }

  /** The page shows the runs. The result says that it no longer does. */
  watch(): () => void {
    return this.reads.watch()
  }

  /** Reads the runs now, such as for Try again. */
  reload(): Promise<void> {
    return this.reads.refresh()
  }

  /**
   * Show older runs: reads the page after the oldest run that the list
   * shows, and adds it at once. From then on, each read gets one page more.
   * A read that started before keeps the page only while it ends at the
   * same run, so the list never has a gap.
   */
  async loadOlder(): Promise<void> {
    const shown = this.window.store.get()
    if (shown.state !== 'ready') return
    const cursor = shown.value.nextCursor
    if (cursor === null) return
    const older = await this.readPage(cursor)
    this.pages += 1
    this.window.confirm((window) =>
      window.nextCursor === cursor
        ? {
            runs: [...window.runs, ...older.runs],
            nextCursor: older.nextCursor,
          }
        : window,
    )
  }

  /**
   * Run now of the owner, with a new request ID. The run shows first at
   * once, and the next read of the runs brings its later state.
   */
  async runNow(): Promise<RoutineRun> {
    const request: RunRoutineRequest = { requestId: this.org.services.newId() }
    const run = await this.client.send(
      'POST',
      routinePaths.runNow(this.org.orgId, this.routineId),
      request,
      readRoutineRunResponse,
    )
    this.window.confirm(
      (window) => ({
        ...window,
        runs: [run, ...window.runs.filter((item) => item.id !== run.id)],
      }),
      `run ${run.id}`,
    )
    return run
  }

  /** The newest `pages` pages, one after the other, as one list. */
  private async readPages(pages: number): Promise<RoutineRunsResponse> {
    let window = await this.readPage(null)
    for (let page = 1; page < pages && window.nextCursor !== null; page += 1) {
      const older = await this.readPage(window.nextCursor)
      window = {
        runs: [...window.runs, ...older.runs],
        nextCursor: older.nextCursor,
      }
    }
    return window
  }

  /** The 50 runs after the run of `before`, or the newest 50. */
  private readPage(before: string | null): Promise<RoutineRunsResponse> {
    return this.client.get(
      routinePaths.runs(this.org.orgId, this.routineId, before ?? undefined),
      readRoutineRunsResponse,
    )
  }

  private show(): void {
    const window = this.window.store.get()
    this.view.set(
      window.state === 'ready'
        ? ready({
            runs: window.value.runs,
            more: window.value.nextCursor !== null,
          })
        : window,
    )
  }
}
