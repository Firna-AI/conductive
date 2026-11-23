import type { HttpFetch } from '../env'
import { HttpError } from '../http'
import { githubFailure, integer, nodes, object, text } from './parsers'
import {
  githubActionFailure,
  githubActionJson,
  githubRepositoryPath,
  githubRequest,
} from './transport'

const REBASE_PULL = `mutation RebasePull($input: UpdatePullRequestBranchInput!) {
  updatePullRequestBranch(input: $input) {
    pullRequest { id }
  }
}`

export async function changePullRequestBase(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  pullNumber: number,
  baseBranch: string,
): Promise<{ baseBranch: string; baseSha: string }> {
  const path = `${githubRepositoryPath(fullName)}/pulls/${pullNumber}`
  const pull = object(
    await githubActionJson(
      fetch,
      githubRequest(path, token, {
        method: 'PATCH',
        body: JSON.stringify({ base: baseBranch }),
      }),
      [200],
    ),
  )
  const base = object(pull.base)
  if (integer(pull.number) !== pullNumber || text(base.ref) !== baseBranch)
    throw githubFailure()
  return { baseBranch, baseSha: text(base.sha) }
}

/** Rebase the head of a pull request onto its current GitHub base. */
export async function rebasePullRequest(
  fetch: HttpFetch,
  token: string,
  pullRequestId: string,
  expectedHeadOid: string,
): Promise<void> {
  const reply = object(
    await githubActionJson(
      fetch,
      githubRequest('/graphql', token, {
        method: 'POST',
        body: JSON.stringify({
          query: REBASE_PULL,
          variables: {
            input: { pullRequestId, expectedHeadOid, updateMethod: 'REBASE' },
          },
        }),
      }),
      [200],
    ),
  )
  if (reply.errors !== undefined) {
    const errors = nodes(reply.errors).map(object)
    if (errors.some((error) => error.type === 'FORBIDDEN'))
      throw githubActionFailure(403)
    if (errors.some((error) => error.type === 'NOT_FOUND'))
      throw githubActionFailure(404)
    throw new HttpError(
      409,
      'github_rebase_refused',
      'GitHub refused the rebase.',
    )
  }
  const result = object(object(reply.data).updatePullRequestBranch)
  if (text(object(result.pullRequest).id) !== pullRequestId)
    throw githubFailure()
}
