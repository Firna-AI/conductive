import {
  routinePaths,
  type RoutineRun,
  type RoutineRunsResponse,
  type RunRoutineRequest,
} from '../shared/routines'
import {
  readRoutineRunResponse,
  readRoutineRunsResponse,
} from './api/read-routine-runs'
import type { OrgModel } from './org-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import { ready, Store, type Loadable, type Readable } from './store'

/**
 * How often a shown Runs list reads its newest runs. The app has no event
 * stream for the runs of a routine, so the page reads them again.
 */
const runsWait = 10_000

/** The runs that the Runs list shows, newest first, and whether older exist. */
export interface ShownRuns {
  runs: readonly RoutineRun[]
  more: boolean
}

/** The older runs that the person read with Show older runs. */
interface Older {
  /** Every run that the list showed since the first older page, by ID. */
  known: ReadonlyMap<string, RoutineRun>
  /** The cursor of the next older page, or null when no older run exists. */
  cursor: string | null
}

/** Newest first, as the Worker sorts them: equal times by ID, descending. */
function newestFirst(a: RoutineRun, b: RoutineRun): number {
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt
  if (a.id === b.id) return 0
  return a.id < b.id ? 1 : -1
}

function withRuns(
  known: ReadonlyMap<string, RoutineRun>,
  runs: readonly RoutineRun[],
): Map<string, RoutineRun> {
  const next = new Map(known)
  for (const run of runs) next.set(run.id, run)
  return next
}

/**
 * The runs of one routine. While its page shows them, the newest runs read
 * every 10 seconds and at each return to the page. Show older runs adds
 * the next older page. From then on, the list keeps each run that it
 * showed, and each read of the newest runs updates them, so a new run that
 * pushes runs out of the newest page leaves no gap.
 */
export class RoutineRuns {
  readonly shown: Readable<Loadable<ShownRuns>>
  private readonly view = new Store<Loadable<ShownRuns>>({ state: 'loading' })
  private readonly newest: Resource<RoutineRunsResponse>
  private readonly reads: Refresher<RoutineRunsResponse>
  private older: Older | null = null
  private readonly org: OrgModel
  private readonly routineId: string

  constructor(org: OrgModel, routineId: string) {
    this.org = org
    this.routineId = routineId
    this.newest = new Resource(() =>
      org.services.api.get(
        routinePaths.runs(org.orgId, routineId),
        readRoutineRunsResponse,
      ),
    )
    this.reads = new Refresher(this.newest, () => runsWait, org.services)
    this.shown = this.view
    this.newest.store.subscribe(() => this.show())
  }

  /** The page shows the runs. The result says that it no longer does. */
  watch(): () => void {
    return this.reads.watch()
  }

  /** Reads the newest runs now, such as for Try again. */
  reload(): Promise<void> {
    return this.reads.refresh()
  }

  /** Reads the next older page, after the oldest run that the list shows. */
  async loadOlder(): Promise<void> {
    const newest = this.newest.store.get()
    if (newest.state !== 'ready') return
    const cursor = this.older ? this.older.cursor : newest.value.nextCursor
    if (cursor === null) return
    const page = await this.org.services.api.get(
      routinePaths.runs(this.org.orgId, this.routineId, cursor),
      readRoutineRunsResponse,
    )
    const known = this.older?.known ?? withRuns(new Map(), newest.value.runs)
    this.older = { known: withRuns(known, page.runs), cursor: page.nextCursor }
    this.show()
  }

  /**
   * Run now of the owner, with a new request ID. The run shows first at
   * once, and the next read of the newest runs brings its later state.
   */
  async runNow(): Promise<RoutineRun> {
    const request: RunRoutineRequest = { requestId: this.org.services.newId() }
    const run = await this.org.services.api.send(
      'POST',
      routinePaths.runNow(this.org.orgId, this.routineId),
      request,
      readRoutineRunResponse,
    )
    this.newest.confirm(
      (page) => ({
        ...page,
        runs: [run, ...page.runs.filter((item) => item.id !== run.id)],
      }),
      `run ${run.id}`,
    )
    return run
  }

  private show(): void {
    const newest = this.newest.store.get()
    if (newest.state !== 'ready') {
      this.view.set(newest)
      return
    }
    if (!this.older) {
      const { runs, nextCursor } = newest.value
      this.view.set(ready({ runs, more: nextCursor !== null }))
      return
    }
    const known = withRuns(this.older.known, newest.value.runs)
    this.older = { ...this.older, known }
    this.view.set(
      ready({
        runs: [...known.values()].sort(newestFirst),
        more: this.older.cursor !== null,
      }),
    )
  }
}
