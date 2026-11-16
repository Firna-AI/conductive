import type {
  AutomationAuthorAccount,
  AutomationTrigger,
} from '../../src/shared/automations'
import type { AppDependencies, AppEnv } from '../env'
import { githubFailure, integer, object, text } from '../github/parsers'
import { githubJson, githubRequest } from '../github/transport'
import { HttpError } from '../http'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { ParsedAutomationTrigger } from './triggers'

export async function resolveAutomationAuthors(
  env: AppEnv,
  userId: string,
  triggers: readonly ParsedAutomationTrigger[],
  dependencies: AppDependencies,
): Promise<AutomationTrigger[]> {
  const accounts = new Map<string, AutomationAuthorAccount>()
  let token: string | undefined
  const resolve = async (
    login: string,
    triggerIndex: number,
    list: 'is' | 'isNot',
  ): Promise<AutomationAuthorAccount> => {
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
        { login, triggerIndex, list },
      )
    }
    const value = object(await githubJson(async () => response, request))
    const account = { githubId: integer(value.id), login: text(value.login) }
    accounts.set(key, account)
    return account
  }
  const result: AutomationTrigger[] = []
  for (const [triggerIndex, trigger] of triggers.entries()) {
    if (trigger.kind !== 'pull-request') {
      result.push(trigger)
      continue
    }
    if (!trigger.authors) {
      result.push({ kind: trigger.kind, event: trigger.event })
      continue
    }
    const included: AutomationAuthorAccount[] = []
    const excluded: AutomationAuthorAccount[] = []
    for (const login of trigger.authors.is)
      included.push(await resolve(login, triggerIndex, 'is'))
    for (const login of trigger.authors.isNot)
      excluded.push(await resolve(login, triggerIndex, 'isNot'))
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
