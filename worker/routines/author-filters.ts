import type {
  RoutineAuthorAccount,
  RoutineTrigger,
} from '../../src/shared/routines'
import type { AppDependencies, AppEnv } from '../env'
import { githubFailure, integer, object, text } from '../github/parsers'
import { githubJson, githubRequest } from '../github/transport'
import { HttpError } from '../http'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { ParsedRoutineTrigger } from './triggers'

export async function resolveRoutineAuthors(
  env: AppEnv,
  userId: string,
  triggers: readonly ParsedRoutineTrigger[],
  dependencies: AppDependencies,
): Promise<RoutineTrigger[]> {
  const accounts = new Map<string, RoutineAuthorAccount>()
  let token: string | undefined
  const resolve = async (login: string): Promise<RoutineAuthorAccount> => {
    const key = login.toLowerCase()
    const saved = accounts.get(key)
    if (saved) return saved
    token ??= await freshGitHubUserToken(env, userId, dependencies)
    const request = githubRequest(`/users/${encodeURIComponent(login)}`, token)
    let response: Response
    try {
      response = await dependencies.fetch(request)
    } catch {
      throw githubFailure()
    }
    if (response.status === 404) {
      await response.body?.cancel()
      throw new HttpError(
        400,
        'unknown_github_login',
        `GitHub account ${login} was not found. Check the login.`,
      )
    }
    const value = object(await githubJson(async () => response, request))
    const account = { githubId: integer(value.id), login: text(value.login) }
    accounts.set(key, account)
    return account
  }
  const result: RoutineTrigger[] = []
  for (const trigger of triggers) {
    if (trigger.kind !== 'pull-request') {
      result.push(trigger)
      continue
    }
    if (!trigger.authors) {
      result.push({ kind: trigger.kind, event: trigger.event })
      continue
    }
    const included: RoutineAuthorAccount[] = []
    const excluded: RoutineAuthorAccount[] = []
    for (const login of trigger.authors.is) included.push(await resolve(login))
    for (const login of trigger.authors.isNot)
      excluded.push(await resolve(login))
    result.push({
      ...trigger,
      authors: {
        members: trigger.authors.members,
        is: included,
        isNot: excluded,
      },
    })
  }
  return result
}
