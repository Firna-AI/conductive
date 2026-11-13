import type { HttpFetch } from '../env'
import { HttpError } from '../http'
import type { BranchRepository } from './branch-data'
import { branchQuery } from './branch-query'
import { object, text } from './parsers'

const BRANCH = `query RepositoryBranch($owner: String!, $name: String!, $ref: String!) {
  repository(owner: $owner, name: $name) { databaseId ref(qualifiedName: $ref) { name } }
}`

export async function checkRepositoryBranch(
  fetch: HttpFetch,
  token: string,
  repository: BranchRepository,
  branch: string,
): Promise<void> {
  const result = await branchQuery(fetch, token, repository, BRANCH, {
    ref: `refs/heads/${branch}`,
  })
  if (result.ref === null)
    throw new HttpError(
      404,
      'branch_not_found',
      `The branch \`${branch}\` is no longer on GitHub.`,
    )
  if (text(object(result.ref).name) !== branch)
    throw new Error('Unexpected GitHub branch')
}
