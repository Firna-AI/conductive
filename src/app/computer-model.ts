import {
  buildEventsPath,
  buildPath,
  orgSettingsPaths,
  type BuildLogEvent,
  type BuildsResponse,
  type ImageBuild,
  type OrgSettings,
  type UpdateOrgSettingsRequest,
} from '../shared/org-settings'
import {
  readBuildEvents,
  readBuildResponse,
  readSettings,
} from './api/read-settings'
import type { Delay } from './events'
import { latestBuild, type OrgModel } from './org-model'
import { Store, type Loadable, type Readable } from './store'

export type ScriptKind = 'installScript' | 'startupScript'

/** The log of one build. A running build adds lines while the tab shows it. */
export interface BuildLog {
  buildId: string
  events: readonly BuildLogEvent[]
}

const pollInterval = 2_000

/** The newest build at one look: its ID and state, and whether it ended. */
interface Newest {
  key: string
  ended: boolean
}

/** The newest build, or `null` while the builds load. */
function newestOf(builds: Loadable<BuildsResponse>): Newest | null {
  if (builds.state !== 'ready') return null
  const build = latestBuild(builds.value)
  if (!build) return { key: '', ended: false }
  return { key: `${build.id} ${build.state}`, ended: build.state !== 'running' }
}

/**
 * The Cloud computer tab: the scripts, the env var names, the builds, and
 * the log of the newest build. Env var values are write-only: a write
 * carries a value, and no answer brings one back.
 */
export class ComputerModel {
  readonly settings: Readable<Loadable<OrgSettings>>
  readonly log = new Store<BuildLog | null>(null)
  private readonly org: OrgModel
  private readonly delay: Delay
  private stopPoll: (() => void) | null = null
  /** `stop` counts one up, so an older request knows that its tab closed. */
  private generation = 0
  private following: (() => void)[] = []
  /** The newest build at the last look, or `null` before the builds load. */
  private newest: Newest | null = null

  constructor(org: OrgModel, delay: Delay = org.services.delay) {
    this.org = org
    this.delay = delay
    this.settings = org.resources.settings.store
  }

  private get api() {
    return this.org.services.api
  }

  /** The settings of the org, which every opening of the tab shares. */
  private get saved() {
    return this.org.resources.settings
  }

  /**
   * The tab shows. It reads the settings, and it follows the builds of the
   * org until `stop`. When the newest build ends, by any path, the settings
   * read again, because the server changes them at a build: a success
   * clears `needsBuild`.
   */
  start(): void {
    this.unfollow()
    this.newest = newestOf(this.org.builds.get())
    this.following = [
      this.org.watch('builds'),
      this.org.builds.subscribe(() => this.followBuilds()),
    ]
    void this.load()
  }

  /**
   * Reads the settings. An answer after `stop` changes nothing, and so does
   * the answer of a read that started before a save answered. A failure
   * keeps the settings that show.
   */
  load(): Promise<void> {
    const run = this.generation
    return this.saved.read(() => run === this.generation)
  }

  private followBuilds(): void {
    const newest = newestOf(this.org.builds.get())
    if (newest?.key === this.newest?.key) return
    const known = this.newest !== null
    this.newest = newest
    if (known && newest?.ended) void this.load()
  }

  private async write(request: UpdateOrgSettingsRequest): Promise<void> {
    await this.saved.save(() =>
      this.api.send(
        'PATCH',
        orgSettingsPaths.settings(this.org.orgId),
        request,
        readSettings,
      ),
    )
  }

  saveScript(kind: ScriptKind, script: string): Promise<void> {
    return this.write(
      kind === 'installScript'
        ? { installScript: script }
        : { startupScript: script },
    )
  }

  /** Sets the value of a variable. The value goes out and never comes back. */
  setEnvVar(name: string, value: string): Promise<void> {
    return this.write({ envVars: [{ operation: 'set', name, value }] })
  }

  removeEnvVar(name: string): Promise<void> {
    return this.write({ envVars: [{ operation: 'remove', name }] })
  }

  /** Build computer, and Try again after a failed build. */
  async startBuild(): Promise<void> {
    const run = this.generation
    const started = await this.api.send(
      'POST',
      orgSettingsPaths.builds(this.org.orgId),
      {},
      readBuildResponse,
    )
    this.org.putBuild(started.build)
    if (run !== this.generation) return
    this.log.set({ buildId: started.build.id, events: started.log })
    if (started.build.state === 'running') this.poll(started.build, run)
    else void this.org.reload('builds')
  }

  /**
   * Shows the log of a build that runs or failed, and follows a running
   * one. The answer also goes to the builds, so a build that ended while
   * no tab showed it no longer shows as running.
   */
  async showLog(build: ImageBuild): Promise<void> {
    const run = this.generation
    const detail = await this.api.get(
      buildPath(this.org.orgId, build.id),
      readBuildResponse,
    )
    if (run !== this.generation) return
    this.org.putBuild(detail.build)
    this.log.set({ buildId: build.id, events: detail.log })
    if (detail.build.state === 'running') this.poll(detail.build, run)
    else void this.org.reload('builds')
  }

  /**
   * Stops the log and the following of the builds. A request that still
   * runs when the tab closes finds a newer generation, so it schedules no
   * more requests and changes no settings.
   */
  stop(): void {
    this.generation += 1
    this.cancelTimer()
    this.unfollow()
  }

  private unfollow(): void {
    for (const stop of this.following.splice(0)) stop()
  }

  private cancelTimer(): void {
    this.stopPoll?.()
    this.stopPoll = null
  }

  private poll(build: ImageBuild, run: number): void {
    this.cancelTimer()
    this.stopPoll = this.delay(pollInterval, () => {
      this.stopPoll = null
      return this.refresh(build, run)
    })
  }

  private async refresh(build: ImageBuild, run: number): Promise<void> {
    const orgId = this.org.orgId
    try {
      const [events, detail] = await Promise.all([
        this.api.get(buildEventsPath(orgId, build.id), readBuildEvents),
        this.api.get(buildPath(orgId, build.id), readBuildResponse),
      ])
      if (run !== this.generation) return
      this.log.set({ buildId: build.id, events })
      this.org.putBuild(detail.build)
      if (detail.build.state === 'running') this.poll(detail.build, run)
      else await this.org.reload('builds')
    } catch {
      if (run === this.generation) this.poll(build, run)
    }
  }
}
