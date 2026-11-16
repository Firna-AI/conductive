import type { SkillsRepositoryLookupResponse } from '../../src/shared/org-settings'
import { isSkillsRepository } from '../../src/shared/skill-folders'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { requireOrgMember } from '../members/permissions'
import type { RequestContext } from '../security/gate'
import { freshGitHubUserToken } from '../security/github-tokens'
import { readShellSettings } from './feature-settings-data'
import { invalidShellInput } from './feature-shell-access'
import { lookupGitHubSkills } from './skills-github'

export async function featureSkills(
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response> {
  if (!context.org) throw invalidShellInput()
  await requireOrgMember(env.DB, context.org.id, context.user.id)
  const { skillsRepository: repository } = await readShellSettings(
    env.DB,
    context.org.id,
  )
  const empty: SkillsRepositoryLookupResponse = {
    repository,
    skills: [],
    notice: null,
    clashes: [],
  }
  if (!repository) return Response.json(empty)
  if (!isSkillsRepository(repository))
    return Response.json({
      ...empty,
      notice: 'not-found',
    } satisfies SkillsRepositoryLookupResponse)
  try {
    const token = await freshGitHubUserToken(env, context.user.id, dependencies)
    return Response.json(
      await lookupGitHubSkills(repository, token, dependencies),
    )
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.code === 'github_reconnect_required' ||
        error.code === 'github_refresh_failed')
    )
      throw error
    return Response.json({
      ...empty,
      notice: 'failed',
    } satisfies SkillsRepositoryLookupResponse)
  }
}
