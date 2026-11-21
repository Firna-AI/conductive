export interface SecretCandidate {
  value: string
  identity: string
  start?: number
}

export const SECRET_MARKER: SecretCandidate = {
  value: '[redacted]',
  identity: 'marker',
}

export interface SecretRun {
  offset: number
  length: number
}

export interface SecretEntry {
  offset: number
  identity: string
  start?: number
}

export interface SecretMatches {
  runs: SecretRun[]
  entries: SecretEntry[]
}

export interface SecretHeld {
  text: string
  matches?: SecretMatches
}

export interface SecretBuffer extends SecretMatches {
  text: string
}

export function secretBuffer(held: SecretHeld): SecretBuffer {
  const { runs = [], entries = [] } = held.matches ?? {}
  let text = '',
    physical = 0
  for (const run of runs) {
    const known = run.offset - text.length
    text += held.text.slice(physical, physical + known)
    physical += known + SECRET_MARKER.value.length
    text += '\0'.repeat(run.length)
  }
  return { text: text + held.text.slice(physical), runs, entries }
}

export function saveSecretBuffer(buffer: SecretBuffer): SecretHeld {
  let text = '',
    from = 0
  for (const run of buffer.runs) {
    text += buffer.text.slice(from, run.offset) + SECRET_MARKER.value
    from = run.offset + run.length
  }
  return {
    text: text + buffer.text.slice(from),
    ...(buffer.runs.length
      ? { matches: { runs: buffer.runs, entries: buffer.entries } }
      : {}),
  }
}

export function appendSecretBuffer(
  buffer: SecretBuffer,
  text: string,
): SecretBuffer {
  return { ...buffer, text: buffer.text + text }
}

export function sliceSecretBuffer(
  buffer: SecretBuffer,
  from: number,
): SecretBuffer {
  return {
    text: buffer.text.slice(from),
    runs: buffer.runs
      .filter((run) => run.offset + run.length > from)
      .map((run) => ({
        offset: Math.max(0, run.offset - from),
        length: run.offset + run.length - Math.max(from, run.offset),
      })),
    entries: buffer.entries
      .filter((entry) => entry.offset >= from)
      .map((entry) => ({ ...entry, offset: entry.offset - from })),
  }
}

export function secretRunEnd(buffer: SecretBuffer, offset: number): number {
  const run = buffer.runs.find(
    (run) => run.offset <= offset && offset < run.offset + run.length,
  )
  return run ? run.offset + run.length : offset
}

export function secretAgrees(
  buffer: SecretBuffer,
  candidate: SecretCandidate,
  offset: number,
  length: number,
): boolean {
  const end = offset + length
  let from = offset,
    unknown = false
  for (const run of buffer.runs) {
    if (run.offset >= end) break
    if (run.offset + run.length <= from) continue
    const knownEnd = Math.max(from, run.offset)
    if (
      buffer.text.slice(from, knownEnd) !==
      candidate.value.slice(from - offset, knownEnd - offset)
    )
      return false
    from = Math.min(end, run.offset + run.length)
    unknown = true
  }
  if (
    buffer.text.slice(from, end) !==
    candidate.value.slice(from - offset, length)
  )
    return false
  return (
    !unknown ||
    buffer.entries.some(
      (entry) =>
        entry.offset === offset &&
        entry.identity === candidate.identity &&
        (entry.start ?? 0) === (candidate.start ?? 0),
    )
  )
}

export function eraseSecretSpans(
  buffer: SecretBuffer,
  spans: readonly SecretRun[],
): SecretBuffer {
  const runs: SecretRun[] = []
  for (const span of [...buffer.runs, ...spans].sort(
    (a, b) => a.offset - b.offset,
  )) {
    const previous = runs.at(-1)
    if (previous && previous.offset + previous.length >= span.offset)
      previous.length = Math.max(
        previous.length,
        span.offset + span.length - previous.offset,
      )
    else runs.push({ ...span })
  }
  let text = buffer.text
  for (const run of runs)
    text =
      text.slice(0, run.offset) +
      '\0'.repeat(run.length) +
      text.slice(run.offset + run.length)
  return { ...buffer, text, runs }
}
