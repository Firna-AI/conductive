import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import type { HttpFetch } from '../env'
import { object } from './parsers'
import {
  githubActionJson,
  githubRepositoryPath,
  githubRequest,
} from './transport'

/** Read the common commit of two pinned GitHub commits. */
export async function compareMergeBase(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  base: string | undefined,
  head: string | undefined,
) {
  if (!isGitCommitOid(base) || !isGitCommitOid(head)) return undefined
  if (base === head) return base
  const path = `${githubRepositoryPath(fullName)}/compare/${base}...${head}?per_page=1`
  const reply = object(
    await githubActionJson(fetch, githubRequest(path, token), [200]),
  )
  const { sha } = object(reply.merge_base_commit)
  return isGitCommitOid(sha) ? sha : undefined
}
