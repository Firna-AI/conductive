import type { Workspace } from '../shared/generated/Workspace'
import type { WorkspaceListRepository } from '../shared/generated/WorkspaceListRepository'
import type { GitHubCapabilities } from '../shared/github'
import type { MembersResponse } from '../shared/members'
import {
  orgSettingsPaths,
  type BuildsResponse,
  type ImageBuild,
  type Repository,
} from '../shared/org-settings'
import type { Section } from '../shared/sections'
import type { ListedAutomation } from './api/read-automations'
import { readBuildResponse } from './api/read-settings'
import { listWithArchives } from './archive-overlay'
import { BranchLists } from './branch-lists'
import { LiveGitHubStates, listWithLiveGitHub } from './live-github'
import { Creations } from './creations'
import { workspaceUpdated } from './list-changes'
import { NewWorkspaceModel } from './new-workspace-model'
import { OrgAgentLogins, type OrgLoginChanged } from './org-agent-logins'
import { orgRefreshers } from './org-refresh'
import { orgResources, type OrgResources } from './org-resources'
import type { Refreshing } from './refresh'
import { SecretsModel } from './secrets-model'
import type { AppServices } from './services'
import {
  derived,
  partOf,
  Store,
  valueOf,
  type Loadable,
  type Readable,
} from './store'
import { WorkspaceActions } from './workspace-actions'
import {
  neverSuspended,
  noteOrgRefusals,
  type OrgSuspension,
} from './suspension'

export { latestBuild } from './latest-build'

export type OrgPart =
  'list' | 'repositories' | 'builds' | 'members' | 'automations' | 'agentLogins'

/**
 * The data of one org: its list of sections and workspaces, its
 * repositories, the builds and settings of its cloud computer, its
 * members, its automations, its org logins, and its secrets. A part reads
 * while a screen shows it, as `watch` says. The Cloud computer tab reads
 * the settings itself. The Secrets tab and the Capabilities control read
 * the secrets. Each request that the API refuses with `org_suspended` goes to
 * `suspension`, so a page with an old org list learns of the suspension.
 */
export class OrgModel {
  readonly orgId: string
  readonly services: AppServices
  readonly suspension: OrgSuspension
  readonly resources: OrgResources
  readonly sections: Readable<Loadable<readonly Section[]>>
  /**
   * The workspaces as screens show them: each Archive that runs shows as
   * done, so it feels instant. A failed Archive shows the row as before.
   */
  readonly workspaces: Readable<Loadable<readonly Workspace[]>>
  /**
   * The workspaces as the server confirmed them, without the Archives that
   * wait for their reply. The detail of the open workspace follows them, so
   * its order never takes a record that a failed Archive takes back. A
   * workspace whose pull request bar shows takes its summary from the bar.
   */
  readonly confirmedWorkspaces: Readable<Loadable<readonly Workspace[]>>
  readonly repositories: Readable<Loadable<readonly Repository[]>>
  readonly listRepositories: Readable<
    Loadable<readonly WorkspaceListRepository[] | undefined>
  >
  readonly builds: Readable<Loadable<BuildsResponse>>
  readonly members: Readable<Loadable<MembersResponse>>
  readonly automations: Readable<Loadable<readonly ListedAutomation[]>>
  /** The org logins of the agents, which the Agents tab shows. */
  readonly agentLogins: OrgAgentLogins
  /** The secrets, which the Secrets tab and Capabilities read when they show. */
  readonly secrets: SecretsModel
  /** The create requests of this tab, which a sign-out ends. */
  readonly creations = new Creations()
  /** The GitHub state of each open pull request bar, over its list mark. */
  readonly liveGitHub = new LiveGitHubStates()
  /** The GitHub access of the signed-in member, by repository ID. */
  private readonly githubAccess = new Map<string, GitHubCapabilities>()
  private readonly queueWriteCount = new Store(0)
  /**
   * Counts the writes of the merge queue that worked in this tab, so the
   * bar of the open workspace reads its place again after each one.
   */
  readonly queueWrites: Readable<number> = this.queueWriteCount
  /** The branches of each repository that the member reads in a picker. */
  readonly branches: BranchLists
  readonly workspaceActions: WorkspaceActions
  private readonly parts: Readonly<Record<OrgPart, Refreshing>>
  private readonly drafts = new Map<string, NewWorkspaceModel>()

  /**
   * `loginsChanged` runs after each change of an org login that an admin
   * makes here, as `OrgLoginChanged` says. Without it, such as in a test
   * of one org, the change reads no account.
   */
  constructor(
    services: AppServices,
    orgId: string,
    suspension: OrgSuspension = neverSuspended,
    loginsChanged?: OrgLoginChanged,
  ) {
    this.suspension = suspension
    const api = noteOrgRefusals(services.api, () => suspension.note())
    this.services = { ...services, api }
    this.orgId = orgId
    this.branches = new BranchLists(api, orgId)
    this.resources = orgResources(api, orgId)
    const { list, repositories, builds, members, automations } = this.resources
    this.secrets = new SecretsModel(api, orgId, services.now)
    this.workspaceActions = new WorkspaceActions(this)
    this.sections = partOf(list.store, (value) => value.sections)
    this.listRepositories = partOf(list.store, (value) => value.repositories)
    this.confirmedWorkspaces = derived(
      partOf(list.store, (value) => value.workspaces),
      this.liveGitHub.store,
      listWithLiveGitHub,
    )
    this.workspaces = derived(
      this.confirmedWorkspaces,
      this.workspaceActions.running,
      listWithArchives,
    )
    this.repositories = repositories.store
    this.builds = builds.store
    this.members = members.store
    this.automations = automations.store
    this.agentLogins = new OrgAgentLogins(api, orgId, loginsChanged)
    this.parts = orgRefreshers(this)
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

  /**
   * Reads the list again after any read that runs, such as after a write
   * of the merge queue, which can change more rows than its change shows.
   */
  rereadList(): Promise<void> {
    return this.parts.list.reread()
  }

  /** A write of the merge queue worked, as `queueWrites` counts it. */
  queueWritten(): void {
    this.queueWriteCount.set(this.queueWriteCount.get() + 1)
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
   * an open, Archive, or a create. Its listed placement stays. A different
   * parent requests a list read after any current read finishes.
   */
  putWorkspace(workspace: Workspace): void {
    const listed = this.confirmedWorkspace(workspace.id)
    this.resources.list.confirm(
      workspaceUpdated(workspace),
      `workspace ${workspace.id}`,
    )
    if (listed && listed.parentId !== workspace.parentId)
      void this.parts.list.reread()
  }

  /** A workspace as screens show it, as `workspaces` says. */
  workspace(workspaceId: string): Workspace | undefined {
    return valueOf(this.workspaces.get())?.find(
      (item) => item.id === workspaceId,
    )
  }

  /** A workspace as the server confirmed it, as `confirmedWorkspaces` says. */
  confirmedWorkspace(workspaceId: string): Workspace | undefined {
    return valueOf(this.confirmedWorkspaces.get())?.find(
      (item) => item.id === workspaceId,
    )
  }

  /**
   * Build computer, and Try again after a failed build. The new build goes
   * to the builds, so each screen that shows them follows it. An answer
   * with a build that ended already, such as one that failed at its start,
   * reads the builds again while `current` says that its screen shows.
   */
  async startBuild(current: () => boolean = () => true): Promise<void> {
    const started = await this.services.api.send(
      'POST',
      orgSettingsPaths.builds(this.orgId),
      {},
      readBuildResponse,
    )
    this.putBuild(started.build)
    if (current() && started.build.state !== 'running') {
      void this.reload('builds')
    }
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

  /**
   * Forgets what GitHub showed the person who signed out: the access and
   * the branch lists.
   */
  forgetGitHubAccess(): void {
    this.githubAccess.clear()
    this.branches.forget()
  }

  /**
   * The last GitHub access of the signed-in member to one repository of
   * the org, as the pull request bar read it. The bar of another workspace
   * of the repository shows it at once, while it reads the access again.
   * A sign-out or another person forgets it, as `forgetGitHubAccess` says.
   */
  githubAccessOf(repositoryId: string): {
    get: () => GitHubCapabilities | undefined
    set: (access: GitHubCapabilities | undefined) => void
  } {
    return {
      get: () => this.githubAccess.get(repositoryId),
      set: (access) => {
        if (access) this.githubAccess.set(repositoryId, access)
        else this.githubAccess.delete(repositoryId)
      },
    }
  }
}
