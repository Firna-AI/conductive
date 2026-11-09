import type {
  GitHubInstallation,
  GitHubRepository,
} from '../../src/shared/account'
import type { AppDependencies, AppEnv } from '../env'
import {
  date,
  githubFailure,
  integer,
  nodes,
  object,
  text,
} from '../github/parsers'
import { githubJson, githubRequest } from '../github/transport'
import { requireActiveUser } from '../data/user-access'
import { warnWorker } from '../warnings'
import { freshGitHubUserToken } from '../security/github-tokens'
import {
  saveShellInstallations,
  type ShellGitHubInstallation,
} from './feature-github-data'

const DEFAULT_GITHUB_APP_SLUG = 'conductive'
const GITHUB_APP_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The install page of the GitHub App that this deployment uses. */
export function githubInstallUrl(env: Pick<AppEnv, 'GITHUB_APP_SLUG'>): string {
  const configured = env.GITHUB_APP_SLUG?.trim()
  const valid = configured && GITHUB_APP_SLUG.test(configured)
  if (configured && !valid) warnWorker({ kind: 'github_app_slug_invalid' })
  const slug = valid ? configured : DEFAULT_GITHUB_APP_SLUG
  return `https://github.com/apps/${slug}/installations/new`
}

async function allPages(
  dependencies: AppDependencies,
  token: string,
  path: string,
  field: 'installations' | 'repositories',
): Promise<unknown[]> {
  const result: unknown[] = []
  for (let page = 1; ; page++) {
    const value = object(
      await githubJson(
        dependencies.fetch,
        githubRequest(`${path}?per_page=100&page=${page}`, token),
      ),
    )
    const entries = nodes(value[field])
    result.push(...entries)
    if (result.length >= integer(value.total_count)) return result
    if (!entries.length) throw githubFailure()
  }
}

function installation(value: unknown): ShellGitHubInstallation {
  const entry = object(value)
  const account = object(entry.account)
  return {
    id: integer(entry.id),
    account: text(account.login),
    accountType: text(account.type),
    settingsUrl: text(entry.html_url),
    suspendedAt: date(entry.suspended_at),
  }
}

function repository(value: unknown, installationId: number): GitHubRepository {
  const entry = object(value)
  return {
    githubId: integer(entry.id),
    fullName: text(entry.full_name),
    description: entry.description === null ? '' : text(entry.description),
    defaultBranch: text(entry.default_branch),
    installationId,
  }
}

export async function shellGitHubAccess(
  env: AppEnv,
  userId: string,
  dependencies: AppDependencies,
): Promise<{
  installations: GitHubInstallation[]
  repositories: GitHubRepository[]
}> {
  await requireActiveUser(env.DB, userId)
  const token = await freshGitHubUserToken(env, userId, dependencies)
  const installations = (
    await allPages(dependencies, token, '/user/installations', 'installations')
  ).map(installation)
  await saveShellInstallations(env.DB, installations, dependencies.now())
  const available: GitHubInstallation[] = []
  const repositories = new Map<number, GitHubRepository>()
  for (const entry of installations) {
    if (entry.suspendedAt !== null) continue
    const items = await allPages(
      dependencies,
      token,
      `/user/installations/${entry.id}/repositories`,
      'repositories',
    )
    for (const item of items) {
      const parsed = repository(item, entry.id)
      repositories.set(parsed.githubId, parsed)
    }
    available.push({
      id: entry.id,
      account: entry.account,
      repositoryCount: items.length,
      settingsUrl: entry.settingsUrl,
    })
  }
  return {
    installations: available.sort(
      (a, b) => a.account.localeCompare(b.account) || a.id - b.id,
    ),
    repositories: [...repositories.values()].sort(
      (a, b) => a.fullName.localeCompare(b.fullName) || a.githubId - b.githubId,
    ),
  }
}
