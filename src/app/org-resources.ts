import { membersPath, type MembersResponse } from '../shared/members'
import {
  orgSettingsPaths,
  type BuildsResponse,
  type OrgSettings,
  type Repository,
} from '../shared/org-settings'
import { automationsPath } from '../shared/automations'
import { sectionsPath } from '../shared/sections'
import { workspacesPath } from '../shared/workspaces'
import type { ApiClient } from './api/client'
import { items, record } from './api/parse'
import { readSection } from './api/read-core'
import { readAutomations, type ListedAutomation } from './api/read-automations'
import { readWorkspaceList } from './api/read-workspaces'
import {
  readBuilds,
  readMembers,
  readRepositories,
  readSettings,
} from './api/read-settings'
import type { ListData } from './list-changes'
import { Resource } from './resource'

/** The parts of one org that its model reads from the API. */
export interface OrgResources {
  readonly list: Resource<ListData>
  readonly repositories: Resource<readonly Repository[]>
  readonly builds: Resource<BuildsResponse>
  readonly members: Resource<MembersResponse>
  readonly automations: Resource<readonly ListedAutomation[]>
  /**
   * The settings of the cloud computer. Every opening of the Cloud
   * computer tab shares them, so a save from a closed tab still shows.
   */
  readonly settings: Resource<OrgSettings>
}

/** The parts of the org `orgId`, each with its read through `api`. */
export function orgResources(api: ApiClient, orgId: string): OrgResources {
  return {
    list: new Resource<ListData>(async () => {
      const [sections, workspaces] = await Promise.all([
        api.get(sectionsPath(orgId), (body) =>
          items(record(body), 'sections', readSection),
        ),
        api.get(workspacesPath(orgId), readWorkspaceList),
      ])
      return { sections, ...workspaces }
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
    automations: new Resource<readonly ListedAutomation[]>(() =>
      api.get(automationsPath(orgId), readAutomations),
    ),
    settings: new Resource<OrgSettings>(() =>
      api.get(orgSettingsPaths.settings(orgId), readSettings),
    ),
  }
}
