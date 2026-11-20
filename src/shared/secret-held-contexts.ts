import {
  secretAgrees,
  type SecretBuffer,
  type SecretCandidate,
  type SecretRun,
} from './secret-held'

export interface SecretContinuation {
  identity: string
  matched: number
}

export function mergeContinuations(
  contexts: readonly SecretContinuation[],
): SecretContinuation[] {
  const merged = new Map<string, SecretContinuation>()
  for (const context of contexts)
    merged.set(JSON.stringify([context.identity, context.matched]), context)
  return [...merged.values()]
}

/** Count only consumed source, with exact evidence across each unknown run. */
export function releasedContinuations(
  buffer: SecretBuffer,
  candidates: readonly SecretCandidate[],
  through: number,
  literals: readonly SecretRun[],
): SecretContinuation[] {
  const contexts: SecretContinuation[] = []
  for (const candidate of candidates) {
    const first = candidate.start
      ? 0
      : Math.max(0, through - candidate.value.length + 1)
    const last = candidate.start ? 0 : through
    for (let offset = first; offset <= last; offset++) {
      const length = through - offset
      if ((!length && !candidate.start) || length >= candidate.value.length)
        continue
      if (
        literals.some(
          (span) => span.offset < offset && offset < span.offset + span.length,
        )
      )
        continue
      if (!secretAgrees(buffer, candidate, offset, length)) continue
      contexts.push({
        identity: candidate.identity,
        matched: (candidate.start ?? 0) + length,
      })
    }
  }
  return mergeContinuations(contexts)
}
