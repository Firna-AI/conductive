import { boatKeyPath, type BoatKeyStatus } from '../shared/api'
import { membersPath, type MembersResponse } from '../shared/members'
import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
  type Repository,
} from '../shared/org-settings'
import { sectionsPath, type Section } from '../shared/sections'
import { workspacesPath, type Workspace } from '../shared/workspaces'
import { items, record } from './api/parse'
import { readBoatKey, readSection } from './api/read-core'
import { readWorkspaces } from './api/read-workspaces'
import { readBuilds, readMembers, readRepositories } from './api/read-settings'
import { NewWorkspaceModel } from './new-workspace-model'
import type { AppServices } from './services'
import { load, loading, patch, Store, valueOf, type Loadable } from './store'

export type OrgPart = 'list' | 'repositories' | 'builds' | 'boatKey' | 'members'

/**
 * The data of one org: its sections and workspaces, its repositories, the
 * builds of its cloud computer, its Boat key status, and its members. Each
 * part loads the first time that a screen needs it.
 */
export class OrgModel {
  readonly orgId: string
  readonly services: AppServices
  readonly sections = new Store<Loadable<readonly Section[]>>(loading)
  readonly workspaces = new Store<Loadable<readonly Workspace[]>>(loading)
  readonly repositories = new Store<Loadable<readonly Repository[]>>(loading)
  readonly builds = new Store<Loadable<BuildsResponse>>(loading)
  readonly boatKey = new Store<Loadable<BoatKeyStatus>>(loading)
  readonly members = new Store<Loadable<MembersResponse>>(loading)
  private readonly requested = new Set<OrgPart>()
  private readonly drafts = new Map<string, NewWorkspaceModel>()

  constructor(services: AppServices, orgId: string) {
    this.services = services
    this.orgId = orgId
  }

  /** Loads a part once. Later calls keep the loaded value. */
  ensure(part: OrgPart): void {
    if (this.requested.has(part)) return
    this.requested.add(part)
    void this.reload(part)
  }

  reload(part: OrgPart): Promise<void> {
    const { api } = this.services
    const id = this.orgId
    switch (part) {
      case 'list':
        return Promise.all([
          load(this.sections, () =>
            api.get(sectionsPath(id), (body) =>
              items(record(body), 'sections', readSection),
            ),
          ),
          load(this.workspaces, () =>
            api.get(workspacesPath(id), readWorkspaces),
          ),
        ]).then(() => undefined)
      case 'repositories':
        return load(this.repositories, () =>
          api.get(orgSettingsPaths.repositories(id), readRepositories),
        )
      case 'builds':
        return load(this.builds, () =>
          api.get(orgSettingsPaths.builds(id), readBuilds),
        )
      case 'boatKey':
        return load(this.boatKey, () => api.get(boatKeyPath(id), readBoatKey))
      case 'members':
        return load(this.members, () => api.get(membersPath(id), readMembers))
    }
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

  /** Puts a workspace in the list: in its place, or at the top when it is new. */
  putWorkspace(workspace: Workspace): void {
    patch(this.workspaces, (list) =>
      list.some((item) => item.id === workspace.id)
        ? list.map((item) => (item.id === workspace.id ? workspace : item))
        : [workspace, ...list],
    )
  }

  workspace(workspaceId: string): Workspace | undefined {
    return valueOf(this.workspaces.get())?.find(
      (item) => item.id === workspaceId,
    )
  }

  /** Puts a build in the history, newest first. */
  putBuild(build: ImageBuild): void {
    patch(this.builds, (builds) => ({
      ...builds,
      builds: [build, ...builds.builds.filter((item) => item.id !== build.id)],
      currentImageBuildId:
        build.state === 'succeeded' ? build.id : builds.currentImageBuildId,
    }))
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
