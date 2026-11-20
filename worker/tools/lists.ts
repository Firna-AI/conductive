import type { AgentListModelsResponse } from '../../src/shared/generated/AgentListModelsResponse'
import type { AgentListRepositoriesResponse } from '../../src/shared/generated/AgentListRepositoriesResponse'
import type { AgentListSectionsResponse } from '../../src/shared/generated/AgentListSectionsResponse'
import type { AgentListWorkspacesResponse } from '../../src/shared/generated/AgentListWorkspacesResponse'
import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'

import { sectionToolMethods } from './section-routes'
import { previewToolMethods } from './preview-routes'
import { listToolWorkspaces } from './workspace-data'
import { workspaceToolMethods } from './workspace-routes'
import { workspaceListInput } from './workspace-input'
import {
  chosenRepositoryIds,
  compareInRepositoryOrder,
} from '../data/repository-order'
import { HttpError } from '../http'
import { readOrgProviderAccount } from '../data/org-provider-account'
import { readImageRepositories } from '../lifecycle/published-image-data'
import type { AgentToolServices } from './services'
import { isAgentSessionPath } from './session-routes'
import { type CallingWorkspace, orgSections, ownerPreference } from './store'

export function isAgentToolPath(path: string): boolean {
  return (
    sectionToolMethods(path) !== null ||
    previewToolMethods(path) !== null ||
    workspaceToolMethods(path) !== null ||
    isAgentSessionPath(path) ||
    [
      MACHINE_PATHS.workspaces,
      MACHINE_PATHS.repositories,
      MACHINE_PATHS.sections,
      MACHINE_PATHS.models,
    ].some((toolPath) => toolPath === path)
  )
}

async function defaultChoice(
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
): Promise<AgentChoice | null> {
  const preference = await ownerPreference(db, caller.ownerUserId)
  if (preference) return { ...preference, fast: false }
  try {
    const selected = await services.ownerDefaultChoice?.(caller.ownerUserId)
    return selected ? { ...selected, fast: false } : null
  } catch (error) {
    if (
      error instanceof HttpError &&
      error.code === 'default_model_unavailable'
    )
      return null
    throw error
  }
}

export async function listFromTool(
  url: URL,
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
  origin: string,
  now: number,
): Promise<
  | AgentListWorkspacesResponse
  | AgentListRepositoriesResponse
  | AgentListSectionsResponse
  | AgentListModelsResponse
> {
  switch (url.pathname) {
    case MACHINE_PATHS.repositories: {
      const repositories = await readImageRepositories(
        db,
        caller.orgId,
        await readOrgProviderAccount(db, caller.orgId),
      )
      repositories.sort(
        compareInRepositoryOrder(await chosenRepositoryIds(db, caller.orgId)),
      )
      return {
        repositories: repositories.map(({ id, fullName, defaultBranch }) => ({
          id,
          fullName,
          defaultBranch,
          current: id === caller.repositoryId,
        })),
      }
    }
    case MACHINE_PATHS.sections:
      return { sections: await orgSections(db, caller.orgId) }
    case MACHINE_PATHS.models:
      return {
        models: (await services.models()).map((model) => ({
          ...model,
          fast: model.fast === true,
        })),
        defaultChoice: await defaultChoice(db, caller, services),
      }
    default:
      return listToolWorkspaces(
        db,
        caller.orgId,
        origin,
        workspaceListInput(url.searchParams),
        now,
      )
  }
}
