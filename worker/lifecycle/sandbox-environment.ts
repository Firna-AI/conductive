import type { CommitAuthor } from '../../src/shared/generated/CommitAuthor'
import {
  COMMIT_AUTHOR_VARIABLES,
  commitAuthor,
} from '../../src/shared/commit-author'
import { isSkillsRepository } from '../../src/shared/skill-folders'
import { effectiveTrustedSkillsRepository } from '../../src/shared/skills-repository-settings'
import { TOOL_ENV } from '../../src/shared/agent-tools'
import { MAX_WORKSPACE_DEPTH } from '../../src/shared/workspace-tree'
import { readUser } from '../data/users'
import { workspaceLink } from '../data/workspace-link'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { workspaceParent } from '../tools/workspace-parent-data'
import { environmentValues, type OrgEnvironment } from './org-environment'
import {
  repositoryEnvironment,
  repositoryLocation,
  type RepositoryLocation,
} from './repository-locations'
import { readWorkspaceToken } from './tokens'
import { readImageSettings } from './settings-data'
import type { WorkspaceRow } from './workspace-row'

/**
 * The runner gives each agent process the turn ID and the turn's author. A
 * shell can load the sandbox variables again, as a login shell does. So the
 * sandbox variables never hold these names, also when the org sets one.
 */
const TURN_VARIABLES: ReadonlySet<string> = new Set([
  TOOL_ENV.turnId,
  ...COMMIT_AUTHOR_VARIABLES,
])

const CONTEXT_VARIABLES: ReadonlySet<string> = new Set([
  'CONDUCTIVE_WORKSPACE_LINK',
  'CONDUCTIVE_WORKSPACE_DEPTH',
  'CONDUCTIVE_WORKSPACE_MAX_DEPTH',
  'CONDUCTIVE_PARENT_WORKSPACE_ID',
  'CONDUCTIVE_PARENT_WORKSPACE_LINK',
])

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
  const token = await readWorkspaceToken(env, workspace.id)
  const { skillsRepository, trustedSkillsRepository } = await readImageSettings(
    env.DB,
    workspace.orgId,
  )
  const tree = await workspaceParent(env.DB, workspace.orgId, workspace.id)
  if (!tree)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return {
    ...Object.fromEntries(
      Object.entries(environmentValues(environment)).filter(
        ([name]) => !TURN_VARIABLES.has(name) && !CONTEXT_VARIABLES.has(name),
      ),
    ),
    ...repositoryEnvironment(locations),
    WORKSPACE_TOKEN: token,
    CONDUCTIVE_WORKSPACE_ID: workspace.id,
    CONDUCTIVE_WORKSPACE_LINK: workspaceLink(
      env.APP_ORIGIN,
      workspace.orgId,
      workspace.id,
    ),
    CONDUCTIVE_WORKSPACE_DEPTH: String(tree.depth),
    CONDUCTIVE_WORKSPACE_MAX_DEPTH: String(MAX_WORKSPACE_DEPTH),
    ...(tree.parentId !== null && {
      CONDUCTIVE_PARENT_WORKSPACE_ID: tree.parentId,
      CONDUCTIVE_PARENT_WORKSPACE_LINK: workspaceLink(
        env.APP_ORIGIN,
        workspace.orgId,
        tree.parentId,
      ),
    }),
    CONDUCTIVE_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
    CONDUCTIVE_DEFAULT_BRANCH: input.defaultBranch,
    CONDUCTIVE_WORKSPACE_BRANCH: workspace.branch,
    CONDUCTIVE_SKILLS_REPOSITORY: isSkillsRepository(skillsRepository)
      ? skillsRepository
      : '',
    CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY: effectiveTrustedSkillsRepository(
      skillsRepository,
      trustedSkillsRepository,
    ),
    CONDUCTIVE_REPOSITORY_DIR: repositoryLocation(
      locations,
      workspace.repositoryId,
    ),
    CONDUCTIVE_DISK_KEEPALIVE: input.diskKeepalive ? '1' : '0',
  }
}

/** Git uses this author outside an agent turn. The start checks report a missing owner. */
export async function ownerCommitAuthor(
  db: D1Database,
  ownerUserId: string,
): Promise<CommitAuthor | null> {
  const owner = await readUser(db, ownerUserId)
  return owner ? commitAuthor(owner) : null
}
