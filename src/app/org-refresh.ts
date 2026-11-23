import type { BuildsResponse, Repository } from '../shared/org-settings'
import type { OrgModel, OrgPart } from './org-model'
import {
  automationsWait,
  buildsWait,
  listWait,
  onEntry,
  orgLoginsWait,
} from './org-waits'
import { Refresher, type Refreshing } from './refresh'
import type { Resource } from './resource'
import type { AppServices } from './services'
import { valueOf, type Loadable, type Readable } from './store'

/** Makes the shared readers of an org's parts. */
export function orgRefreshers(
  org: Pick<OrgModel, 'resources' | 'agentLogins' | 'services'>,
): Readonly<Record<OrgPart, Refreshing>> {
  const { list, repositories, builds, members, automations } = org.resources
  const { services } = org
  return {
    list: new Refresher(list, listWait, services),
    repositories: new RepositoryRefresher(repositories, builds.store, services),
    builds: new Refresher(builds, buildsWait, services),
    members: new Refresher(members, onEntry, services),
    automations: new Refresher(automations, automationsWait, services),
    agentLogins: new Refresher(
      org.agentLogins.resource,
      orgLoginsWait,
      services,
    ),
  }
}

/**
 * Reads shown repositories after a completed build or a changed published
 * image. Readiness stays in the repositories reply. A fresh read waits for
 * an older read, and starts only while a repository watcher remains.
 */
class RepositoryRefresher extends Refresher<readonly Repository[]> {
  private watchers = 0
  private reading: Promise<void> | null = null
  private previous: BuildsResponse | undefined
  private stopFollowing: (() => void) | null = null
  private readonly builds: Readable<Loadable<BuildsResponse>>

  constructor(
    repositories: Resource<readonly Repository[]>,
    builds: Readable<Loadable<BuildsResponse>>,
    services: Pick<AppServices, 'delay' | 'onFocus'>,
  ) {
    super(repositories, onEntry, services)
    this.builds = builds
  }

  override watch(): () => void {
    this.watchers += 1
    if (this.watchers === 1) {
      this.previous = valueOf(this.builds.get())
      this.stopFollowing = this.builds.subscribe(() => this.followBuilds())
    }
    const release = super.watch()
    let shown = true
    return () => {
      if (!shown) return
      shown = false
      release()
      this.watchers -= 1
      if (this.watchers === 0) {
        this.stopFollowing?.()
        this.stopFollowing = null
      }
    }
  }

  override refresh(): Promise<void> {
    const reading = super.refresh()
    if (this.reading !== reading) {
      this.reading = reading
      void reading.then(() => {
        if (this.reading === reading) this.reading = null
      })
    }
    return reading
  }

  private followBuilds(): void {
    const builds = valueOf(this.builds.get())
    if (!builds) return
    const previous = this.previous
    this.previous = builds
    const imageChanged = previous
      ? builds.currentImageBuildId !== previous.currentImageBuildId
      : builds.currentImageBuildId !== null
    const completed = builds.builds.some(
      (build) =>
        build.state !== 'running' &&
        previous?.builds.find((item) => item.id === build.id)?.state !==
          build.state,
    )
    if (imageChanged || completed) void this.rereadShown()
  }

  private async rereadShown(): Promise<void> {
    if (this.reading) await this.reading
    if (this.watchers > 0) await this.refresh()
  }
}
