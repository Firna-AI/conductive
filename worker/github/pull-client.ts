import type { HttpFetch } from '../env'
import { githubFailure, integer, object, text } from './parsers'
import {
  githubActionJson,
  githubRepositoryPath,
  githubRequest,
} from './transport'

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
