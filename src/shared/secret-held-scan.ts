import {
  SECRET_MARKER,
  eraseSecretSpans,
  secretAgrees,
  secretRunEnd,
  sliceSecretBuffer,
  type SecretBuffer,
  type SecretCandidate,
  type SecretEntry,
} from './secret-held'

function candidatesAt(candidates: readonly SecretCandidate[], offset: number) {
  return candidates.filter((candidate) => !candidate.start || offset === 0)
}

export function scanSecretBuffer(
  buffer: SecretBuffer,
  candidates: readonly SecretCandidate[],
  final: boolean,
) {
  const remaining = (offset: number) => buffer.text.length - offset
  const holdAt = (offset: number) =>
    !final &&
    candidatesAt(candidates, offset).some(
      (candidate) =>
        candidate.value.length > remaining(offset) &&
        secretAgrees(buffer, candidate, offset, remaining(offset)),
    )
  const matchAt = (offset: number) => {
    const end = secretRunEnd(buffer, offset)
    const complete = (candidate: SecretCandidate) =>
      candidate.value.length <= remaining(offset) &&
      (end === offset || offset + candidate.value.length > end) &&
      secretAgrees(buffer, candidate, offset, candidate.value.length)
    const secret = candidatesAt(candidates, offset).find(complete)
    if (
      complete(SECRET_MARKER) &&
      (!secret || secret.value.length <= SECRET_MARKER.value.length)
    )
      return SECRET_MARKER.value.length
    return secret?.value.length ?? 0
  }
  let text = '',
    index = 0
  while (index < buffer.text.length) {
    if (holdAt(index)) break
    const length = matchAt(index)
    if (length) {
      text += SECRET_MARKER.value
      index += length
    } else if (secretRunEnd(buffer, index) > index) {
      const end = secretRunEnd(buffer, index)
      let next = index + 1
      while (next < end && !holdAt(next) && !matchAt(next)) next++
      text += SECRET_MARKER.value
      index = next
    } else {
      const point = String.fromCodePoint(
        buffer.text.codePointAt(index) ?? 0xfffd,
      )
      text += point
      index += point.length
    }
  }
  return { text, held: sliceSecretBuffer(buffer, index) }
}

/** Preserve exact matches across erased copies, including complete fallbacks. */
export function protectSecretBuffer(
  buffer: SecretBuffer,
  candidates: readonly SecretCandidate[],
  eraseCandidates = candidates,
): SecretBuffer {
  const entries: (SecretEntry & { length: number })[] = []
  for (const candidate of [...candidates, SECRET_MARKER]) {
    for (let offset = 0; offset < buffer.text.length; offset++) {
      if (candidate.start && offset !== 0) continue
      const length = Math.min(
        candidate.value.length,
        buffer.text.length - offset,
      )
      if (secretAgrees(buffer, candidate, offset, length))
        entries.push({
          offset,
          identity: candidate.identity,
          ...(candidate.start ? { start: candidate.start } : {}),
          length,
        })
    }
  }
  const spans = []
  for (const candidate of eraseCandidates) {
    for (
      let offset = 0;
      offset + candidate.value.length <= buffer.text.length;
      offset++
    ) {
      if (candidate.start && offset !== 0) continue
      if (secretAgrees(buffer, candidate, offset, candidate.value.length))
        spans.push({ offset, length: candidate.value.length })
    }
  }
  const erased = eraseSecretSpans(buffer, spans)
  erased.entries = entries
    .filter((entry) =>
      erased.runs.some(
        (run) =>
          run.offset < entry.offset + entry.length &&
          run.offset + run.length > entry.offset,
      ),
    )
    .map(({ offset, identity, start }) => ({
      offset,
      identity,
      ...(start ? { start } : {}),
    }))
  return erased
}

export function resumeCandidates(
  buffer: SecretBuffer,
  candidates: readonly SecretCandidate[],
): SecretCandidate[] {
  const result = [...candidates]
  for (const entry of buffer.entries) {
    if (!entry.start) continue
    const candidate = candidates.find(
      (candidate) => candidate.identity === entry.identity,
    )
    if (candidate && candidate.value.length > entry.start)
      result.push({
        ...candidate,
        value: candidate.value.slice(entry.start),
        start: entry.start,
      })
  }
  return result.sort((a, b) => b.value.length - a.value.length)
}
