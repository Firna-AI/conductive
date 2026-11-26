import type { HttpFetch } from '../env'
import { compareMergeBase } from '../github/compare-merge-base'
import { HttpError } from '../http'
import type { QueueEntry } from './contracts'

type Comparison = 'aligned' | 'restack' | 'contained' | 'unknown'

/** A move must also drop commits that belonged to a removed lower layer. */
export async function layerAncestry(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  entry: Pick<QueueEntry, 'oldBase' | 'oldBaseHead'>,
  base: string,
  head: string,
): Promise<Comparison> {
  const compare = (below: string, above: string) =>
    compareMergeBase(fetch, token, fullName, below, above).catch(
      (error: unknown) => {
        if (error instanceof HttpError && error.code === 'github_not_found')
          return undefined
        throw error
      },
    )
  const common = await compare(base, head)
  if (!common) return 'unknown'
  if (common === head) return 'contained'
  if (common !== base) return 'restack'
  const old = entry.oldBase
  if (!old || old === base) return 'aligned'
  const inLayer = entry.oldBaseHead === head ? old : await compare(old, head)
  if (!inLayer) return 'unknown'
  if (inLayer !== old) return 'aligned'
  const inBase = await compare(old, base)
  if (!inBase) return 'unknown'
  return inBase === old ? 'aligned' : 'restack'
}
