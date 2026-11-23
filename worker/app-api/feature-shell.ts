import { ACCOUNT_PATHS } from '../../src/shared/account'
import { API_PATHS } from '../../src/shared/api'
import {
  buildsAtAdd,
  orgSettingsPaths,
  REPOSITORY_POSITION_SUFFIX,
} from '../../src/shared/org-settings'
import { sectionsPath } from '../../src/shared/sections'
import { workspacePath } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import type { RequestContext } from '../security/gate'
import { shellGitHubAccess, githubInstallUrl } from './feature-github'
import { createShellOrg } from './feature-org'
import {
  changeShellRepository,
  moveShellRepositoryRoute,
  shellRepositoryChoices,
} from './feature-repositories'
import { featureSectionWrite } from './feature-sections'
import { featureSettings } from './feature-settings'
import { featureSkills } from './feature-skills'
import { shellChildId } from './feature-shell-access'
import { featureWorkspaceWrite } from './feature-workspaces'
import { workspaceChildId } from './workspace-path'
import { orgAgentLoginsRoute } from './org-agent-logins'

export async function featureShellRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const userId = context.user.id
  if (
    request.method === 'GET' &&
    [ACCOUNT_PATHS.githubInstallations, ACCOUNT_PATHS.githubRepositories].some(
      (value) => value === path,
    )
  ) {
    const access = await shellGitHubAccess(env, userId, dependencies)
    return Response.json(
      path === ACCOUNT_PATHS.githubInstallations
        ? {
            installations: access.installations,
            installUrl: githubInstallUrl(env),
          }
        : { repositories: access.repositories },
    )
  }
  if (path === API_PATHS.orgs && request.method === 'POST')
    return createShellOrg(env, context, dependencies)
  if (!context.org) return null
  const orgId = context.org.id
  if (path === orgSettingsPaths.skills(orgId) && request.method === 'GET')
    return featureSkills(env, context, dependencies)
  const agentLogins = await orgAgentLoginsRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (agentLogins) return agentLogins
  if (
    path === orgSettingsPaths.settings(orgId) &&
    ['GET', 'PATCH'].includes(request.method)
  )
    return featureSettings(
      env,
      context,
      dependencies,
      request.method === 'PATCH',
    )
  if (path === orgSettingsPaths.repositories(orgId) && request.method === 'GET')
    return Response.json({
      repositories: await shellRepositoryChoices(
        env,
        orgId,
        userId,
        dependencies,
      ),
    })
  const movedRepositoryId = repositoryPositionId(path, orgId)
  if (movedRepositoryId !== null && request.method === 'PUT')
    return moveShellRepositoryRoute(
      env,
      orgId,
      userId,
      movedRepositoryId,
      context.body,
    )
  const repositoryId = shellChildId(path, orgSettingsPaths.repositories(orgId))
  if (repositoryId && ['PUT', 'DELETE'].includes(request.method))
    return changeShellRepository(
      env,
      orgId,
      userId,
      repositoryId,
      {
        selected: request.method === 'PUT',
        build: buildsAtAdd(context.body),
      },
      dependencies,
    )
  const sectionId = shellChildId(path, sectionsPath(orgId))
  if (
    (path === sectionsPath(orgId) && request.method === 'POST') ||
    (sectionId && ['PATCH', 'DELETE'].includes(request.method))
  )
    return featureSectionWrite(request, env, context, dependencies, sectionId)
  if (request.method === 'PATCH') {
    const workspaceId = workspaceChildId(path, orgId)
    if (workspaceId && path === workspacePath(orgId, workspaceId))
      return featureWorkspaceWrite(env, context, dependencies, workspaceId)
  }
  return null
}

/** The repository ID of a move path of the repository order, or `null`. */
function repositoryPositionId(path: string, orgId: string): string | null {
  if (!path.endsWith(REPOSITORY_POSITION_SUFFIX)) return null
  return shellChildId(
    path.slice(0, -REPOSITORY_POSITION_SUFFIX.length),
    orgSettingsPaths.repositories(orgId),
  )
}
