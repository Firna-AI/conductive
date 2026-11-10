import {
  commitAuthor,
  commitAuthorEnvironment,
} from '../../src/shared/commit-author'
import { readUser } from '../data/users'
import type { AppEnv } from '../env'
import { environmentValues, type OrgEnvironment } from './org-environment'
import {
  repositoryEnvironment,
  repositoryLocation,
  type RepositoryLocation,
} from './repository-locations'
import { readWorkspaceToken } from './tokens'
import type { WorkspaceRow } from './workspace-data'

export async function sandboxEnvironment(
  env: AppEnv,
  input: {
    workspace: WorkspaceRow
    environment: OrgEnvironment
    locations: readonly RepositoryLocation[]
    defaultBranch: string
    diskKeepalive: boolean
  },
): Promise<Record<string, string>> {
  const { workspace, environment, locations } = input
  // The start checks of the owner report a missing owner. Skip the author.
  const owner = await readUser(env.DB, workspace.ownerUserId)
  const token = await readWorkspaceToken(env, workspace.id)
  return {
    ...environmentValues(environment),
    ...repositoryEnvironment(locations),
    ...(owner ? commitAuthorEnvironment(commitAuthor(owner)) : {}),
    WORKSPACE_TOKEN: token,
    CONDUCTIVE_WORKSPACE_ID: workspace.id,
    CONDUCTIVE_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
    CONDUCTIVE_DEFAULT_BRANCH: input.defaultBranch,
    CONDUCTIVE_WORKSPACE_BRANCH: workspace.branch,
    CONDUCTIVE_REPOSITORY_DIR: repositoryLocation(
      locations,
      workspace.repositoryId,
    ),
    CONDUCTIVE_TURN_ID: '',
    CONDUCTIVE_ACTIVATION_ID: '',
    CONDUCTIVE_DISK_KEEPALIVE: input.diskKeepalive ? '1' : '0',
  }
}
