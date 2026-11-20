import { TOOL_MARKER, type ToolCandidate } from './tool-detail-identity'
import type { MatchEntry, ToolHeldBuffer } from './tool-detail-held'

export function runEnd(buffer: ToolHeldBuffer, offset: number) {
  const run = buffer.runs.find(
    (run) => run.offset <= offset && offset < run.offset + run.length,
  )
  return run ? run.offset + run.length : offset
}

/** Every candidate must verify its own known text and exact identity at this offset. */
export function agrees(
  buffer: ToolHeldBuffer,
  candidate: ToolCandidate,
  offset: number,
  length: number,
) {
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
        entry.offset === offset && entry.identity === candidate.identity,
    )
  )
}

export function heldCandidates(
  buffer: ToolHeldBuffer,
  candidates: readonly ToolCandidate[],
) {
  const found: (MatchEntry & { length: number; holdsEnd: boolean })[] = []
  for (const candidate of [...candidates, TOOL_MARKER]) {
    for (let offset = 0; offset < buffer.text.length; offset++) {
      const length = Math.min(
        candidate.value.length,
        buffer.text.length - offset,
      )
      if (agrees(buffer, candidate, offset, length))
        found.push({
          offset,
          length,
          identity: candidate.identity,
          holdsEnd:
            candidate.value.length > buffer.text.length - offset ||
            (candidate === TOOL_MARKER &&
              candidate.value.length === buffer.text.length - offset),
        })
    }
  }
  return found
}

export function crossingEntries(
  buffer: ToolHeldBuffer,
  found: ReturnType<typeof heldCandidates>,
) {
  return found
    .filter((entry) =>
      buffer.runs.some(
        (run) =>
          run.offset < entry.offset + entry.length &&
          run.offset + run.length > entry.offset,
      ),
    )
    .map(({ offset, identity }) => ({ offset, identity }))
}
