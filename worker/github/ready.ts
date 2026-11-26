import type {
  GitHubReadyRequest,
  GitHubReadyResponse,
} from '../../src/shared/github'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import type { GitHubWorkspace } from './contracts'
import { memberGitHub } from './member-github'
import type { GitHubMergeDependencies } from './merge-handler'
import { githubFailure, integer, object, text } from './parsers'
import { githubJson, githubRequest, graphql } from './transport'

const READY_PULL = `query ReadyPull($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) { id state isDraft }
  }
}`

const MARK_READY = `mutation MarkReady($id: ID!) {
  markPullRequestReadyForReview(input: {pullRequestId: $id}) {
    pullRequest { isDraft }
  }
}`

const readyForbidden = () =>
  new HttpError(
    403,
    'github_ready_forbidden',
    "Not marked ready: your GitHub access doesn't allow changes to this pull request.",
  )
const readyPullChanged = () =>
  new HttpError(
    409,
    'github_pull_changed',
    'Not marked ready: the branch has another pull request now. Review it, then try again.',
  )
const readyRefused = () =>
  new HttpError(
    409,
    'github_ready_refused',
    'Not marked ready: GitHub refused the change.',
  )

export async function markPullRequestReady(
  fetch: HttpFetch,
  token: string,
  id: string,
): Promise<void> {
  const reply = object(
    await githubJson(
      fetch,
      githubRequest('/graphql', token, {
        method: 'POST',
        body: JSON.stringify({ query: MARK_READY, variables: { id } }),
      }),
    ),
  )
  if (reply.errors !== undefined) throw readyRefused()
}

/**
 * Marks the draft pull request of the workspace branch ready for review, as
 * the member, with the member's own GitHub token. It needs write access,
 * as Merge does. The pull request must be the one that the bar showed. A
 * pull request that is no longer a draft needs no change. After the change,
 * every open tab gets the new GitHub state.
 */
export async function markReady(
  env: AppEnv,
  dependencies: GitHubMergeDependencies,
  workspace: GitHubWorkspace,
  userId: string,
  input: GitHubReadyRequest,
): Promise<GitHubReadyResponse> {
  const member = await memberGitHub(env, dependencies, workspace, userId)
  const { fetch, token, checked } = member
  const access = await member.capabilities()
  if (!access.canWrite) throw readyForbidden()
  const current = await member.branches()
  if (current.pullNumber !== input.pullNumber) throw readyPullChanged()
  const [owner, name] = workspace.fullName.split('/')
  const result = await checked(() =>
    graphql(fetch, token, READY_PULL, {
      owner,
      name,
      number: input.pullNumber,
    }),
  )
  const repository = object(result.repository)
  if (integer(repository.databaseId) !== workspace.repositoryId)
    throw githubFailure()
  const pull = object(repository.pullRequest)
  if (text(pull.state) !== 'OPEN') throw readyRefused()
  if (pull.isDraft === true)
    await checked(() => markPullRequestReady(fetch, token, text(pull.id)))
  await member.refresh()
  return { state: 'ready' }
}
