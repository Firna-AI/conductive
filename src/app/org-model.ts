import { membersPath, type MembersResponse } from '../shared/members'
import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
  type OrgSettings,
  type Repository,
} from '../shared/org-settings'
import { sectionsPath, type Section } from '../shared/sections'
import {
  workspacesPath,
  type Workspace,
  type WorkspaceState,
} from '../shared/workspaces'
import { items, record } from './api/parse'
import { readSection } from './api/read-core'
import { readWorkspaces } from './api/read-workspaces'
import {
  readBuilds,
  readMembers,
  readRepositories,
  readSettings,
} from './api/read-settings'
import { Creations } from './creations'
import { workspaceUpdated, type ListData } from './list-changes'
import { NewWorkspaceModel } from './new-workspace-model'
import { Refresher, type RefreshWait, type Refreshing } from './refresh'
import { Resource } from './resource'
import type { AppServices } from './services'
import { ready, Store, valueOf, type Loadable, type Readable } from './store'
import {
  neverSuspended,
  noteOrgRefusals,
  type OrgSuspension,
} from './suspension'

export type OrgPart = 'list' | 'repositories' | 'builds' | 'members'

/**
 * How soon a shown part reads again. These are choices of the app, not
 * product limits: soon while a workspace or a build is active, and slowly
 * otherwise, so that changes from other tabs and people show.
 */
const activeWait = 5_000
const idleWait = 30_000
const activeStates: ReadonlySet<WorkspaceState> = new Set([
  'working',
  'input',
  'starting',
])

const listWait: RefreshWait<ListData> = (list) =>
  list?.workspaces.some((workspace) => activeStates.has(workspace.state))
    ? activeWait
    : idleWait

const buildsWait: RefreshWait<BuildsResponse> = (builds) =>
  builds?.builds.some((build) => build.state === 'running')
    ? activeWait
    : idleWait

/** Repositories and members read at entry and focus only. */
const onEntry: RefreshWait<unknown> = () => null

/** One part of a loaded value, which changes only when that part changes. */
function partOf<T, P>(
  source: Readable<Loadable<T>>,
  pick: (value: T) => P,
): Readable<Loadable<P>> {
  const select = (value: Loadable<T>): Loadable<P> =>
    value.state === 'ready' ? ready(pick(value.value)) : value
  const target = new Store(select(source.get()))
  source.subscribe(() => {
    const next = source.get()
    const current = target.get()
    const kept =
      next.state === 'ready' &&
      current.state === 'ready' &&
      pick(next.value) === current.value
    if (!kept) target.set(select(next))
  })
  return target
}

/**
 * The data of one org: its list of sections and workspaces, its
 * repositories, the builds and settings of its cloud computer, and its
 * members. A part reads while a screen shows it, as
 * `watch` says. The Cloud computer tab reads the settings itself. Each
 * request of the org that the API refuses with `org_suspended` goes to
 * `suspension`, so a page with an old org list learns of the suspension.
 */
export class OrgModel {
  readonly orgId: string
  readonly services: AppServices
  readonly suspension: OrgSuspension
  readonly resources: {
    readonly list: Resource<ListData>
    readonly repositories: Resource<readonly Repository[]>
    readonly builds: Resource<BuildsResponse>
    readonly members: Resource<MembersResponse>
    /**
     * The settings of the cloud computer. Every opening of the Cloud
     * computer tab shares them, so a save from a closed tab still shows.
     */
    readonly settings: Resource<OrgSettings>
  }
  readonly sections: Readable<Loadable<readonly Section[]>>
  readonly workspaces: Readable<Loadable<readonly Workspace[]>>
  readonly repositories: Readable<Loadable<readonly Repository[]>>
  readonly builds: Readable<Loadable<BuildsResponse>>
  readonly members: Readable<Loadable<MembersResponse>>
  /** The admitted creates of this tab, until their starts end. */
  readonly creations: Creations
  private readonly parts: Readonly<Record<OrgPart, Refreshing>>
  private readonly drafts = new Map<string, NewWorkspaceModel>()
  /** The workspaces that the server removed while this tab showed them. */
  private readonly removed = new Set<string>()

  constructor(
    services: AppServices,
    orgId: string,
    suspension: OrgSuspension = neverSuspended,
  ) {
    this.suspension = suspension
    const api = noteOrgRefusals(services.api, () => suspension.note())
    this.services = { ...services, api }
    this.orgId = orgId
    this.resources = {
      list: new Resource<ListData>(async () => {
        const [sections, workspaces] = await Promise.all([
          api.get(sectionsPath(orgId), (body) =>
            items(record(body), 'sections', readSection),
          ),
          api.get(workspacesPath(orgId), readWorkspaces),
        ])
        return { sections, workspaces }
      }),
      repositories: new Resource<readonly Repository[]>(() =>
        api.get(orgSettingsPaths.repositories(orgId), readRepositories),
      ),
      builds: new Resource<BuildsResponse>(() =>
        api.get(orgSettingsPaths.builds(orgId), readBuilds),
      ),
      members: new Resource<MembersResponse>(() =>
        api.get(membersPath(orgId), readMembers),
      ),
      settings: new Resource<OrgSettings>(() =>
        api.get(orgSettingsPaths.settings(orgId), readSettings),
      ),
    }
    const { list, repositories, builds, members } = this.resources
    this.sections = partOf(list.store, (value) => value.sections)
    this.workspaces = partOf(list.store, (value) => value.workspaces)
    this.repositories = repositories.store
    this.builds = builds.store
    this.members = members.store
    this.parts = {
      list: new Refresher(list, listWait, this.services),
      repositories: new Refresher(repositories, onEntry, this.services),
      builds: new Refresher(builds, buildsWait, this.services),
      members: new Refresher(members, onEntry, this.services),
    }
    this.creations = new Creations(this)
  }

  /**
   * A screen shows these parts. Each part reads at once, at each return of
   * the user to the page, and on its timer, until the last screen that
   * shows it calls the result. Screens that show a part share its reads.
   */
  watch(...parts: OrgPart[]): () => void {
    const releases = parts.map((part) => this.parts[part].watch())
    return () => {
      for (const release of releases) release()
    }
  }

  /** Reads a part now, such as for Try again. */
  reload(part: OrgPart): Promise<void> {
    return this.parts[part].refresh()
  }

  /** The draft of New workspace for a section. It stays while the app is open. */
  newWorkspace(sectionId: string | null): NewWorkspaceModel {
    const key = sectionId ?? ''
    let draft = this.drafts.get(key)
    if (!draft) {
      draft = new NewWorkspaceModel(this, sectionId)
      this.drafts.set(key, draft)
    }
    return draft
  }

  /**
   * Puts a newer record of a workspace in the list, such as from an event,
   * an open, Archive, or a create. Its place in the list stays.
   */
  putWorkspace(workspace: Workspace): void {
    if (this.removed.has(workspace.id)) return
    this.resources.list.confirm(
      workspaceUpdated(workspace),
      `workspace ${workspace.id}`,
    )
  }

  /**
   * Takes a workspace out of the list, such as a create whose sandbox did
   * not start, which the server removes. A list answer that started before
   * keeps it out, and so does a later record of it from this tab.
   */
  removeWorkspace(workspaceId: string): void {
    this.removed.add(workspaceId)
    this.resources.list.confirm(
      (list) => ({
        ...list,
        workspaces: list.workspaces.filter((item) => item.id !== workspaceId),
      }),
      `workspace ${workspaceId}`,
    )
  }

  workspace(workspaceId: string): Workspace | undefined {
    return valueOf(this.workspaces.get())?.find(
      (item) => item.id === workspaceId,
    )
  }

  /** Puts a newer record of a build in the history, newest first. */
  putBuild(build: ImageBuild): void {
    this.resources.builds.confirm(
      (builds) => ({
        ...builds,
        builds: [
          build,
          ...builds.builds.filter((item) => item.id !== build.id),
        ],
        currentImageBuildId:
          build.state === 'succeeded' ? build.id : builds.currentImageBuildId,
      }),
      `build ${build.id}`,
    )
  }
}

/** The build that new workspaces start from, the newest good build. */
export function currentBuild(builds: BuildsResponse): ImageBuild | undefined {
  return (
    builds.builds.find((build) => build.id === builds.currentImageBuildId) ??
    builds.builds.find((build) => build.state === 'succeeded')
  )
}

/**
 * The newest run of the install script, which the Cloud computer tab shows
 * first. A refresh only fetches commits, so it does not count.
 */
export function latestBuild(builds: BuildsResponse): ImageBuild | undefined {
  return builds.builds
    .filter((build) => build.kind === 'build')
    .sort((a, b) => b.startedAt - a.startedAt)[0]
}
