import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import {
  MACHINE_PATHS,
  type AgentListModelsResponse,
  type AgentListRepositoriesResponse,
  type AgentListSectionsResponse,
  type AgentListWorkspacesResponse,
} from '../../src/shared/agent-tools'
import type { AgentChoice } from '../../src/shared/agents'
import { HttpError } from '../http'
import { readImageRepositories } from '../lifecycle/published-image-data'
import type { AgentToolServices } from './services'
import {
  type CallingWorkspace,
  orgSections,
  orgWorkspaces,
  ownerPreference,
} from './store'

export function isAgentToolPath(path: string): boolean {
  return [
    MACHINE_PATHS.workspaces,
    MACHINE_PATHS.repositories,
    MACHINE_PATHS.sections,
    MACHINE_PATHS.models,
  ].some((toolPath) => toolPath === path)
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

async function defaultChoice(
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
): Promise<AgentChoice | null> {
  const preference = await ownerPreference(db, caller.ownerUserId)
  if (preference) return preference
  try {
    return (await services.ownerDefaultChoice?.(caller.ownerUserId)) ?? null
  } catch (error) {
    if (
      error instanceof HttpError &&
      error.code === 'default_model_unavailable'
    ) {
      captureUnexpectedWorkerFailure('default_model_fallback', error)
      return null
    }
    throw error
  }
}

export async function listFromTool(
  path: string,
  db: D1Database,
  caller: CallingWorkspace,
  services: AgentToolServices,
  origin: string,
): Promise<
  | AgentListWorkspacesResponse
  | AgentListRepositoriesResponse
  | AgentListSectionsResponse
  | AgentListModelsResponse
> {
  switch (path) {
    case MACHINE_PATHS.repositories: {
      const repositories = await readImageRepositories(db, caller.orgId)
      repositories.sort(
        (a, b) =>
          compareText(a.fullName.toLowerCase(), b.fullName.toLowerCase()) ||
          compareText(a.fullName, b.fullName) ||
          compareText(a.id, b.id),
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
        models: await services.models(),
        defaultChoice: await defaultChoice(db, caller, services),
      }
    default:
      return { workspaces: await orgWorkspaces(db, caller.orgId, origin) }
  }
}
