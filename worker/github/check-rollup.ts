import type { GitHubCheck } from '../../src/shared/github'
import type { GitHubPull } from './banner'
import { parseCheck } from './checks'
import { githubFailure, nextPage, nodes, object, text } from './parsers'

type ReadPage = (
  after: string | null,
  mergeAfter: string | null,
) => Promise<Record<string, unknown>>

function mergeId(pull: Record<string, unknown>): string | null {
  return pull.potentialMergeCommit === null
    ? null
    : text(object(pull.potentialMergeCommit).oid)
}

function connection(pull: Record<string, unknown>, merge: boolean) {
  const rollup = merge
    ? object(pull.potentialMergeCommit).statusCheckRollup
    : pull.statusCheckRollup
  return rollup === null ? null : object(object(rollup).contexts)
}

/** Choose one commit's rollup, then page it without mixing commit versions. */
export async function readChecks(
  pull: GitHubPull,
  firstPage: Record<string, unknown>,
  readPage: ReadPage,
): Promise<GitHubCheck[]> {
  const page = async (after: string | null, mergeAfter: string | null) => {
    const current = object((await readPage(after, mergeAfter)).pullRequest)
    if (text(current.headRefOid) !== pull.headSha) throw githubFailure()
    return current
  }
  let current = firstPage
  const capturedMergeId = mergeId(current)
  const mergeConnection =
    capturedMergeId === null ? null : connection(current, true)
  const useMerge =
    mergeConnection !== null && nodes(mergeConnection.nodes).length > 0
  const checks: GitHubCheck[] = []
  let after: string | null = null
  do {
    if (mergeId(current) !== capturedMergeId) throw githubFailure()
    const selected = connection(current, useMerge)
    if (selected === null) return checks
    checks.push(
      ...nodes(selected.nodes).map((value) => parseCheck(value, pull.url)),
    )
    after = nextPage(selected.pageInfo, after)
    if (after !== null)
      current = await page(useMerge ? null : after, useMerge ? after : null)
  } while (after !== null)
  return checks
}
