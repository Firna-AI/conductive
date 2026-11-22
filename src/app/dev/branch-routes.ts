import { searchedBranches } from '../../../docs/mockups/src/fixtures/branches'
import {
  repositoryBranchesPath,
  type RepositoryBranchesResponse,
} from '../../shared/branches'
import type { Repository } from '../../shared/org-settings'
import { requireOrg, type DevBackend } from './backend'
import { ID, json, RouteError, type Route } from './router'

/**
 * How the branch list of the dev fake answers besides the list: never, with
 * a failed read of GitHub, or with a GitHub account that cannot read the
 * repository.
 */
export const DEV_BRANCH_LISTS = ['loading', 'failed', 'no-access'] as const

export type DevBranchList = 'list' | (typeof DEV_BRANCH_LISTS)[number]

/**
 * How the branch check of a create answers a branch other than the default
 * branch besides finding it: the branch is no longer on GitHub, or the
 * GitHub account cannot read the repository.
 */
export const DEV_BRANCH_CHECKS = ['missing', 'no-access'] as const

export type DevBranchCheck = 'found' | (typeof DEV_BRANCH_CHECKS)[number]

const units = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const

/** The age of a row of the mockups, such as `2h`, in milliseconds. */
function ageOf(updated: string): number {
  const match = /^(\d+)([mhd])$/.exec(updated)
  if (!match) return 0
  const unit = match[2] === 'm' || match[2] === 'h' ? match[2] : 'd'
  return Number(match[1]) * units[unit]
}

/**
 * The branches of a repository, as the Worker lists them: newest commit
 * first. acme/storefront has the branches of the mockups. Each other
 * repository has its default branch only.
 */
function branchesOf(
  repository: Repository,
  now: number,
): RepositoryBranchesResponse {
  const others =
    repository.fullName === 'acme/storefront'
      ? searchedBranches('').map((row) => ({
          name: row.name,
          committedAt: now - ageOf(row.updated),
        }))
      : []
  return {
    branches: [
      { name: repository.defaultBranch, committedAt: now - 3_600_000 },
      ...others,
    ].sort(
      (a, b) => b.committedAt - a.committedAt || a.name.localeCompare(b.name),
    ),
  }
}

const noAccess = () =>
  new RouteError(
    403,
    'github_access_required',
    'Your GitHub account cannot read this repository.',
  )

/**
 * The branch check of a create, as the Worker makes it for each named
 * branch other than the default branch.
 */
export function checkBranches(
  repository: Repository,
  named: readonly (string | undefined)[],
  check: DevBranchCheck,
): void {
  const branch = named.find(
    (name) => name !== undefined && name !== repository.defaultBranch,
  )
  if (branch === undefined || check === 'found') return
  if (check === 'no-access') throw noAccess()
  throw new RouteError(
    404,
    'branch_not_found',
    `The branch \`${branch}\` is no longer on GitHub.`,
  )
}

/** The branch list of a repository of the org. */
export function branchRoutes(
  backend: DevBackend,
  answer: DevBranchList,
): Route[] {
  return [
    {
      method: 'GET',
      path: repositoryBranchesPath(ID.org, ID.repository),
      answer: ({ params }) => {
        const org = requireOrg(backend.state, params.org)
        const repository = org.repositories.find(
          (item) => item.id === params.repository,
        )
        if (!repository) {
          throw new RouteError(
            404,
            'repository_not_found',
            'The repository is not available.',
          )
        }
        switch (answer) {
          case 'loading':
            return new Promise<Response>(() => undefined)
          case 'failed':
            throw new RouteError(
              502,
              'github_unavailable',
              'GitHub is not available. Try again.',
            )
          case 'no-access':
            throw noAccess()
          case 'list':
            return json(branchesOf(repository, backend.now()))
        }
      },
    },
  ]
}
