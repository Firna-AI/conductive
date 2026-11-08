import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
  type OrgSettings,
  type UpdateOrgSettingsRequest,
} from '../shared/org-settings'
import { readBuildResponse, readSettings } from './api/read-settings'
import { BuildLogFollower, type BuildLog } from './build-log-follower'
import type { Delay } from './events'
import { latestBuild, type OrgModel } from './org-model'
import { Store, type Loadable, type Readable } from './store'

export type ScriptKind = 'installScript' | 'startupScript'

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

/** The build whose log the tab shows: the newest, while it runs or failed. */
function logTarget(builds: BuildsResponse): ImageBuild | undefined {
  const latest = latestBuild(builds)
  return latest?.state === 'succeeded' ? undefined : latest
}

/** The follower of the log that shows. */
interface Following {
  follower: BuildLogFollower
  /** Stops the copy of the follower's log into the log of the model. */
  release: () => void
}

/**
 * The Cloud computer tab: the scripts, the env var names, the builds, and
 * the log of the newest build. Env var values are write-only: a write
 * carries a value, and no answer brings one back.
 */
export class ComputerModel {
  readonly settings: Readable<Loadable<OrgSettings>>
  private readonly shownLog = new Store<BuildLog | null>(null)
  /**
   * The log of the newest build while it runs or after it failed, as the
   * model follows it while the tab shows, or `null`.
   */
  readonly log: Readable<BuildLog | null> = this.shownLog
  private readonly org: OrgModel
  private readonly delay: Delay
  /** `stop` counts one up, so an older request knows that its tab closed. */
  private generation = 0
  private following: (() => void)[] = []
  /** The newest build at the last look, or `null` before the builds load. */
  private newest: Newest | null = null
  private logFollowing: Following | null = null

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
   * org and the log of the newest build until `stop`. When the newest
   * build ends, by any path, the settings read again, because the server
   * changes them at a build: a success clears `needsBuild`.
   */
  start(): void {
    this.unfollow()
    this.newest = newestOf(this.org.builds.get())
    this.following = [
      this.org.watch('builds'),
      this.org.builds.subscribe(() => this.followBuilds()),
    ]
    this.followLog()
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
    this.followLog()
    const newest = newestOf(this.org.builds.get())
    if (newest?.key === this.newest?.key) return
    const known = this.newest !== null
    this.newest = newest
    if (known && newest?.ended) void this.load()
  }

  /**
   * Follows the log of the build that the tab shows. Another build
   * replaces the follower, so the answers of the old one change nothing. A
   * new state of the same build goes to its follower.
   */
  private followLog(): void {
    const builds = this.org.builds.get()
    if (builds.state !== 'ready') return
    const target = logTarget(builds.value)
    const current = this.logFollowing?.follower
    if (target && current?.buildId === target.id) {
      current.saw(target)
      return
    }
    this.replaceFollower(target)
  }

  private replaceFollower(target: ImageBuild | undefined): void {
    if (this.logFollowing) {
      this.logFollowing.release()
      this.logFollowing.follower.stop()
      this.logFollowing = null
    }
    if (!target) {
      this.shownLog.set(null)
      return
    }
    const follower = new BuildLogFollower(this.org, this.delay, target)
    const show = () => this.shownLog.set(follower.log.get())
    this.logFollowing = { follower, release: follower.log.subscribe(show) }
    show()
    void follower.read()
  }

  /** Try again of a log that did not load. */
  reloadLog(): Promise<void> {
    return this.logFollowing?.follower.read() ?? Promise.resolve()
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

  /**
   * Build computer, and Try again after a failed build. The new build goes
   * to the builds, so a tab that shows follows its log. A build that ended
   * already reads the builds again while the tab shows.
   */
  async startBuild(): Promise<void> {
    const run = this.generation
    const started = await this.api.send(
      'POST',
      orgSettingsPaths.builds(this.org.orgId),
      {},
      readBuildResponse,
    )
    this.org.putBuild(started.build)
    if (run === this.generation && started.build.state !== 'running') {
      void this.org.reload('builds')
    }
  }

  /**
   * Stops the following of the builds and of the log. A request that still
   * runs when the tab closes finds a newer generation or a stopped
   * follower, so it schedules no more requests and changes no settings.
   */
  stop(): void {
    this.generation += 1
    this.unfollow()
  }

  private unfollow(): void {
    for (const stop of this.following.splice(0)) stop()
    this.replaceFollower(undefined)
  }
}
