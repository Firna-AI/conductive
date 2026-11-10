import { importOid } from '../../../src/shared/conductor-import-values.ts'
import type { GitInput } from './git.ts'

/** Ref tips suggest roots. Only Worker receipts can authorize their omission. */
export async function localPrerequisiteCandidates(
  git: (args: string[], input?: GitInput) => Promise<string>,
  headOid: string,
  signal: AbortSignal,
): Promise<string[]> {
  const refs = await git([
    'for-each-ref',
    '--format=%(objectname)',
    'refs/heads',
    'refs/remotes',
  ])
  const tips = new Set(refs.split('\n').filter(Boolean).map(importOid))
  tips.delete(headOid)
  const result = new Set<string>()
  for (const tip of tips) {
    signal.throwIfAborted()
    try {
      const bases = await git(['merge-base', '--all', headOid, tip], {
        allowFailure: true,
      })
      for (const oid of bases.split('\n').filter(Boolean))
        result.add(importOid(oid))
    } catch {
      signal.throwIfAborted()
    }
  }
  return [...result].sort()
}
