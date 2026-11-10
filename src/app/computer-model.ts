import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
  type OrgSettings,
  type UpdateOrgSettingsRequest,
} from '../shared/org-settings'
import { readSettings } from './api/read-settings'
import { BuildLogFollower, type BuildLog } from './build-log-follower'
import type { Delay } from './events'
import { latestBuild, type OrgModel } from './org-model'
import { Store, type Loadable, type Readable } from './store'

export type ScriptKind = 'installScript' | 'startupScript'

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
 * The Cloud computer tab: the scripts, the env var names with their Secret
 * marks, the builds, and the log of the newest build. Env var values are
 * write-only: a write carries a value, and no answer brings one back.
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
   * org and the log of the newest build until `stop`. The builds, not the
   * settings, say which saved changes the org image lacks, such as a
   * changed install script. They read again while a build runs and at its
   * end, so the end of a build reads no settings.
   */
  start(): void {
    this.unfollow()
    this.following = [
      this.org.watch('builds'),
      this.org.builds.subscribe(() => this.followLog()),
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

  /**
   * Saves a script. A save of the install script reads the builds again,
   * because they say whether the org image ran the saved script, so the
   * notice of a changed install script shows at once.
   */
  async saveScript(kind: ScriptKind, script: string): Promise<void> {
    if (kind === 'startupScript') {
      await this.write({ startupScript: script })
      return
    }
    await this.write({ installScript: script })
    void this.org.reload('builds')
  }

  /**
   * Sets the value and the Secret mark of a variable, as Add variable
   * does. The value goes out and never comes back.
   */
  setEnvVar(name: string, value: string, secret: boolean): Promise<void> {
    return this.write({ envVars: [{ operation: 'set', name, value, secret }] })
  }

  /**
   * Replaces only the value of a variable. The write sends no mark, so the
   * Worker keeps the mark that it stores when it applies the write, and a
   * name that it does not know starts secret. The value goes out and never
   * comes back.
   */
  replaceEnvVar(name: string, value: string): Promise<void> {
    return this.write({ envVars: [{ operation: 'set', name, value }] })
  }

  /** Sets only the Secret mark of a variable. No value goes out or back. */
  classifyEnvVar(name: string, secret: boolean): Promise<void> {
    return this.write({ envVars: [{ operation: 'classify', name, secret }] })
  }

  removeEnvVar(name: string): Promise<void> {
    return this.write({ envVars: [{ operation: 'remove', name }] })
  }

  /**
   * Build computer, and Try again after a failed build, as
   * `OrgModel.startBuild` sends them. A tab that shows follows the log of
   * the new build. A build that ended already reads the builds again only
   * while the tab shows.
   */
  startBuild(): Promise<void> {
    const run = this.generation
    return this.org.startBuild(() => run === this.generation)
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
