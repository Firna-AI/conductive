import type { GitHubBanner } from '../../src/shared/github'
import { parsePull, pullBanner } from './banner'
import { readChecks } from './check-rollup'
import type {
  GitHubBranchDependencies,
  GitHubReadDependencies,
  GitHubSnapshot,
  GitHubWorkspace,
} from './contracts'
import {
  githubFailure,
  integer,
  nextPage,
  nodes,
  object,
  text,
} from './parsers'
import { CHECKS, COMPARE, LOOKUP, PULL, REVIEWS } from './queries'
import { graphql } from './transport'
import { checkRepositoryBranch } from './branch-check'
import { requireGitBranchName } from './branch-name'
import { HttpError } from '../http'

export class GitHubReader {
  private readonly dependencies: GitHubReadDependencies
  private readonly workspace: GitHubWorkspace
  private readonly token: string
  private liveDefaultBranch: string
  private branchPull: {
    dependencies: GitHubBranchDependencies
    pull: Record<string, unknown>
  } | null = null

  constructor(
    dependencies: GitHubReadDependencies,
    workspace: GitHubWorkspace,
    token: string,
  ) {
    this.dependencies = dependencies
    this.workspace = workspace
    this.token = token
    this.liveDefaultBranch = workspace.defaultBranch
  }

  private async repository(query: string, variables: Record<string, unknown>) {
    const [owner, name] = this.workspace.fullName.split('/')
    const result = await graphql(this.dependencies.fetch, this.token, query, {
      owner,
      name,
      ...variables,
    })
    const repository = object(result.repository)
    if (integer(repository.databaseId) !== this.workspace.repositoryId)
      throw githubFailure()
    return repository
  }

  async defaultBranch(): Promise<string> {
    const repository = await this.repository(LOOKUP, {
      head: this.workspace.branch,
      ref: `refs/heads/${this.workspace.branch}`,
      states: ['OPEN'],
      after: null,
    })
    return repository.defaultBranchRef === null
      ? this.workspace.defaultBranch
      : text(object(repository.defaultBranchRef).name)
  }

  async read(branches?: GitHubBranchDependencies): Promise<GitHubSnapshot> {
    const lookup = branches ?? (await this.dependenciesForBranch())
    const baseChange = await this.baseChange()
    if (lookup.pullNumber === null) {
      const snapshot = await this.withoutPull(
        lookup.headSha,
        baseChange?.to ?? lookup.baseBranch,
      )
      if (baseChange) {
        snapshot.banner.baseMoved = baseChange.from
        snapshot.baseChange = baseChange
      }
      return snapshot
    }
    const firstPage =
      this.branchPull?.dependencies === lookup
        ? this.branchPull.pull
        : object(
            (await this.repository(PULL, { number: lookup.pullNumber }))
              .pullRequest,
          )
    this.branchPull = null
    const pull = parsePull(firstPage, this.workspace)
    const checks = await readChecks(pull, firstPage, (after, mergeAfter) =>
      this.repository(CHECKS, { number: pull.number, after, mergeAfter }),
    )
    const reviewers = await this.reviewers(
      pull.number,
      firstPage.latestOpinionatedReviews,
    )
    return {
      banner: pullBanner(
        baseChange
          ? { ...this.workspace, baseBranch: baseChange.to }
          : this.workspace,
        pull,
        checks,
        reviewers,
        this.dependencies.now(),
      ),
      checks: { state: 'available', checks },
      headSha: pull.headSha,
      pullBaseBranch: pull.baseBranch,
      ...(baseChange ? { baseChange } : {}),
    }
  }

  async dependenciesForBranch(): Promise<GitHubBranchDependencies> {
    this.branchPull = null
    let headSha: string | null = null
    let fullName = this.workspace.fullName
    let baseBranch = this.workspace.baseBranch ?? this.workspace.defaultBranch
    for (const states of [['OPEN'], ['MERGED', 'CLOSED']]) {
      let after: string | null = null
      do {
        const repository = await this.repository(LOOKUP, {
          head: this.workspace.branch,
          ref: `refs/heads/${this.workspace.branch}`,
          states,
          after,
        })
        fullName = text(repository.nameWithOwner)
        this.liveDefaultBranch =
          repository.defaultBranchRef === null
            ? this.workspace.defaultBranch
            : text(object(repository.defaultBranchRef).name)
        baseBranch =
          this.workspace.baseBranch != null ||
          repository.defaultBranchRef === null
            ? baseBranch
            : text(object(repository.defaultBranchRef).name)
        headSha =
          repository.ref === null
            ? null
            : text(object(object(repository.ref).target).oid)
        const connection = object(repository.pullRequests)
        for (const item of nodes(connection.nodes)) {
          const pull = object(item)
          if (
            pull.headRepository !== null &&
            integer(object(pull.headRepository).databaseId) ===
              this.workspace.repositoryId &&
            text(pull.headRefName) === this.workspace.branch
          ) {
            const dependencies = {
              pullNumber: integer(pull.number),
              headBranch: this.workspace.branch,
              headSha,
              fullName,
              baseBranch: this.workspace.baseBranch ?? text(pull.baseRefName),
            }
            this.branchPull = { dependencies, pull }
            return dependencies
          }
        }
        after = nextPage(connection.pageInfo, after)
      } while (after !== null)
    }
    return {
      pullNumber: null,
      headBranch: this.workspace.branch,
      headSha,
      fullName,
      baseBranch,
    }
  }

  private async baseChange(): Promise<GitHubSnapshot['baseChange']> {
    const from = this.workspace.baseBranch
    if (from == null) return undefined
    requireGitBranchName(from)
    try {
      await checkRepositoryBranch(
        this.dependencies.fetch,
        this.token,
        {
          githubId: this.workspace.repositoryId,
          fullName: this.workspace.fullName,
          defaultBranch: this.liveDefaultBranch,
        },
        from,
      )
      return undefined
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 'branch_not_found')
        throw error
      requireGitBranchName(this.liveDefaultBranch)
      if (from === this.liveDefaultBranch) throw githubFailure()
      return { from, to: this.liveDefaultBranch }
    }
  }

  private async withoutPull(
    headSha: string | null,
    baseBranch: string,
  ): Promise<GitHubSnapshot> {
    let ahead = 0
    if (headSha !== null) {
      const repository = await this.repository(COMPARE, {
        baseRef: `refs/heads/${baseBranch}`,
        headRef: headSha,
      })
      const comparison = object(object(repository.ref).compare)
      ahead = integer(comparison.aheadBy)
    }
    const banner: GitHubBanner = {
      state: ahead > 0 ? 'none' : 'no-commits',
      branch: this.workspace.branch,
      baseBranch,
      updatedAt: this.dependencies.now(),
      pullRequest: null,
    }
    return {
      banner,
      checks: { state: 'waiting-for-pull-request', checks: [] },
      headSha,
    }
  }

  private async reviewers(
    number: number,
    firstPage: unknown,
  ): Promise<string[]> {
    const reviewers: string[] = []
    let after: string | null = null
    let connection = object(firstPage)
    do {
      for (const value of nodes(connection.nodes)) {
        const review = object(value)
        if (review.state === 'CHANGES_REQUESTED' && review.author !== null) {
          reviewers.push(text(object(review.author).login))
        }
      }
      after = nextPage(connection.pageInfo, after)
      if (after !== null) {
        const repository = await this.repository(REVIEWS, { number, after })
        connection = object(
          object(repository.pullRequest).latestOpinionatedReviews,
        )
      }
    } while (after !== null)
    return reviewers
  }
}
