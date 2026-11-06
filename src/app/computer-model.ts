import {
  buildEventsPath,
  buildPath,
  orgSettingsPaths,
  type BuildLogEvent,
  type ImageBuild,
  type OrgSettings,
  type UpdateOrgSettingsRequest,
} from '../shared/org-settings'
import {
  readBuildEvents,
  readBuildResponse,
  readSettings,
} from './api/read-settings'
import { browserDelay, type Delay } from './events'
import type { OrgModel } from './org-model'
import { load, loading, Store, type Loadable } from './store'

export type ScriptKind = 'installScript' | 'startupScript'

/** The log of one build. A running build adds lines while the tab shows it. */
export interface BuildLog {
  buildId: string
  events: readonly BuildLogEvent[]
}

const pollInterval = 2_000

/**
 * The Cloud computer tab: the scripts, the env var names, the builds, and
 * the log of the newest build. Env var values are write-only: a write
 * carries a value, and no answer brings one back.
 */
export class ComputerModel {
  readonly settings = new Store<Loadable<OrgSettings>>(loading)
  readonly log = new Store<BuildLog | null>(null)
  private readonly org: OrgModel
  private readonly delay: Delay
  private stopPoll: (() => void) | null = null
  /** `stop` counts one up, so an older request knows that its tab closed. */
  private generation = 0

  constructor(org: OrgModel, delay: Delay = browserDelay) {
    this.org = org
    this.delay = delay
  }

  private get api() {
    return this.org.services.api
  }

  load(): Promise<void> {
    return load(this.settings, () =>
      this.api.get(orgSettingsPaths.settings(this.org.orgId), readSettings),
    )
  }

  private async write(request: UpdateOrgSettingsRequest): Promise<void> {
    const settings = await this.api.send(
      'PATCH',
      orgSettingsPaths.settings(this.org.orgId),
      request,
      readSettings,
    )
    this.settings.set({ state: 'ready', value: settings })
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

  /** Shows the log of a build that runs or failed, and follows a running one. */
  async showLog(build: ImageBuild): Promise<void> {
    const run = this.generation
    const detail = await this.api.get(
      buildPath(this.org.orgId, build.id),
      readBuildResponse,
    )
    if (run !== this.generation) return
    this.log.set({ buildId: build.id, events: detail.log })
    if (detail.build.state === 'running') this.poll(detail.build, run)
  }

  /**
   * Stops the log. A request that still runs when the tab closes finds a
   * newer generation, so it schedules no more requests.
   */
  stop(): void {
    this.generation += 1
    this.cancelTimer()
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
