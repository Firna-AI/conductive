import {
  buildPath,
  type BuildLogEvent,
  type BuildResponse,
  type ImageBuild,
} from '../shared/org-settings'
import type { ApiError } from './api/client'
import { readBuildResponse } from './api/read-settings'
import type { Delay } from './events'
import type { OrgModel } from './org-model'
import { asApiError, Store, type Readable } from './store'

/** The log of the build that the Cloud computer tab shows. */
export interface BuildLog {
  buildId: string
  events: readonly BuildLogEvent[]
  /** Why the log did not load, until a read of it answers. */
  error: ApiError | null
}

/** The wait between two reads of the log of a running build. */
const pollInterval = 2_000

/**
 * Follows the log of one build. It reads the log when the owner asks, and
 * again on its timer while the build runs. Each answer also goes to the
 * builds of the org. The follower owns its requests and its timer: one
 * read runs or one timer waits at a time, and after `stop` an answer
 * changes nothing and schedules nothing.
 */
export class BuildLogFollower {
  readonly buildId: string
  private readonly shown: Store<BuildLog>
  readonly log: Readable<BuildLog>
  /** The state of the build in the newest answer, or in the builds before. */
  private state: ImageBuild['state']
  private reading: Promise<void> | null = null
  /** The newest state that the builds showed while a read ran, or `null`. */
  private sawWhileReading: ImageBuild['state'] | null = null
  private cancelTimer: (() => void) | null = null
  private stopped = false
  private readonly org: OrgModel
  private readonly delay: Delay

  constructor(org: OrgModel, delay: Delay, build: ImageBuild) {
    this.org = org
    this.delay = delay
    this.buildId = build.id
    this.state = build.state
    this.shown = new Store<BuildLog>({
      buildId: build.id,
      events: [],
      error: null,
    })
    this.log = this.shown
  }

  /**
   * Reads the log now: at the start, for Try again, and when the builds
   * show a new state of the build. A read that runs already counts. A
   * failure shows its error until a read answers.
   */
  read(): Promise<void> {
    return this.run((error) =>
      this.shown.change((log) => ({ ...log, error: asApiError(error) })),
    )
  }

  /**
   * The builds show this build. A state that no answer showed, such as the
   * end of the build, reads the log again. While a read runs, the follower
   * keeps the state, and reads again after that read if its answer did not
   * show the state.
   */
  saw(build: ImageBuild): void {
    if (build.state === this.state) return
    if (this.reading) this.sawWhileReading = build.state
    else void this.read()
  }

  /** Cancels the timer. An answer that comes after it changes nothing. */
  stop(): void {
    this.stopped = true
    this.clearTimer()
  }

  /** The timer reads the full log and state. A failure waits again. */
  private poll(): Promise<void> {
    return this.run(() => this.schedule())
  }

  /** Reads one build snapshot while no other read runs, in place of the timer. */
  private run(failed: (error: unknown) => void): Promise<void> {
    if (this.stopped) return Promise.resolve()
    if (this.reading) return this.reading
    this.clearTimer()
    const reading = this.org.services.api
      .get(buildPath(this.org.orgId, this.buildId), readBuildResponse)
      .then(
        (answer) => this.settle(() => this.answered(answer)),
        (error: unknown) => this.settle(() => failed(error)),
      )
    this.reading = reading
    return reading
  }

  /**
   * Applies the end of a read. Then a state that the builds showed during
   * the read, and that the answer did not show, reads the log again.
   */
  private settle(apply: () => void): void {
    this.reading = null
    const saw = this.sawWhileReading
    this.sawWhileReading = null
    if (this.stopped) return
    apply()
    if (saw !== null && saw !== this.state) void this.read()
  }

  /**
   * Shows the lines of an answer, and gives its build to the builds. The
   * state changes first, so the builds that show it ask for no read. At
   * the end of the build, the builds read again.
   */
  private answered(answer: BuildResponse): void {
    this.state = answer.build.state
    this.shown.set({ buildId: this.buildId, events: answer.log, error: null })
    this.org.putBuild(answer.build)
    if (answer.build.state === 'running') this.schedule()
    else void this.org.reload('builds')
  }

  private schedule(): void {
    if (this.stopped) return
    this.clearTimer()
    this.cancelTimer = this.delay(pollInterval, () => {
      this.cancelTimer = null
      return this.poll()
    })
  }

  private clearTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
  }
}
