import type { GitHubBanner, GitHubCheck } from '../../src/shared/github'
import { parsePull, pullBanner, type GitHubPull } from './banner'
import { parseCheck } from './checks'
import type {
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
import { CHECKS, LOOKUP, PULL, REVIEWS } from './queries'
import { githubJson, githubRequest, graphql } from './transport'

export class GitHubReader {
  private readonly dependencies: GitHubReadDependencies
  private readonly workspace: GitHubWorkspace
  private readonly token: string

  constructor(
    dependencies: GitHubReadDependencies,
    workspace: GitHubWorkspace,
    token: string,
  ) {
    this.dependencies = dependencies
    this.workspace = workspace
    this.token = token
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

  async read(): Promise<GitHubSnapshot> {
    const lookup = await this.lookup()
    if (lookup.number === null) {
      return this.withoutPull(
        lookup.headSha,
        lookup.fullName,
        lookup.baseBranch,
      )
    }
    const repository = await this.repository(PULL, { number: lookup.number })
    const pull = parsePull(repository.pullRequest, this.workspace)
    const checks = await this.checks(pull)
    const reviewers = await this.reviewers(pull.number)
    return {
      banner: pullBanner(
        this.workspace,
        pull,
        checks,
        reviewers,
        this.dependencies.now(),
      ),
      checks: { state: 'available', checks },
      headSha: pull.headSha,
    }
  }

  private async lookup() {
    let headSha: string | null = null
    let fullName = this.workspace.fullName
    let baseBranch = this.workspace.defaultBranch
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
        baseBranch =
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
            return {
              number: integer(pull.number),
              headSha,
              fullName,
              baseBranch,
            }
          }
        }
        after = nextPage(connection.pageInfo, after)
      } while (after !== null)
    }
    return { number: null, headSha, fullName, baseBranch }
  }

  private async withoutPull(
    headSha: string | null,
    fullName: string,
    baseBranch: string,
  ): Promise<GitHubSnapshot> {
    let ahead = 0
    if (headSha !== null) {
      const comparison = object(
        await githubJson(
          this.dependencies.fetch,
          githubRequest(
            `/repos/${fullName.split('/').map(encodeURIComponent).join('/')}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(headSha)}`,
            this.token,
          ),
        ),
      )
      ahead = integer(comparison.ahead_by)
    }
    const repositoryUrl = `https://github.com/${fullName.split('/').map(encodeURIComponent).join('/')}`
    const banner: GitHubBanner = {
      state: ahead > 0 ? 'none' : 'no-commits',
      branch: this.workspace.branch,
      baseBranch,
      updatedAt: this.dependencies.now(),
      pullRequest: null,
      createPullRequestUrl:
        ahead > 0
          ? `${repositoryUrl}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(this.workspace.branch)}?expand=1`
          : null,
    }
    return {
      banner,
      checks: { state: 'waiting-for-pull-request', checks: [] },
      headSha,
    }
  }

  private async checks(pull: GitHubPull): Promise<GitHubCheck[]> {
    const checks: GitHubCheck[] = []
    let after: string | null = null
    do {
      const repository = await this.repository(CHECKS, {
        number: pull.number,
        after,
      })
      const current = object(repository.pullRequest)
      if (text(current.headRefOid) !== pull.headSha) throw githubFailure()
      if (current.statusCheckRollup === null) return checks
      const connection = object(object(current.statusCheckRollup).contexts)
      checks.push(
        ...nodes(connection.nodes).map((value) => parseCheck(value, pull.url)),
      )
      after = nextPage(connection.pageInfo, after)
    } while (after !== null)
    return checks
  }

  private async reviewers(number: number): Promise<string[]> {
    const reviewers: string[] = []
    let after: string | null = null
    do {
      const repository = await this.repository(REVIEWS, { number, after })
      const connection = object(
        object(repository.pullRequest).latestOpinionatedReviews,
      )
      for (const value of nodes(connection.nodes)) {
        const review = object(value)
        if (review.state === 'CHANGES_REQUESTED' && review.author !== null) {
          reviewers.push(text(object(review.author).login))
        }
      }
      after = nextPage(connection.pageInfo, after)
    } while (after !== null)
    return reviewers
  }
}
