import {
  agrees,
  crossingEntries,
  heldCandidates,
  runEnd,
} from './tool-detail-match'
import { TOOL_MARKER, type ToolCandidate } from './tool-detail-identity'
import {
  heldBuffer,
  joinHeld,
  saveHeldBuffer,
  sliceHeld,
  type ToolHeldBuffer,
  type ToolHeldState,
} from './tool-detail-held'
import { toolTextBlocks } from './tool-detail-source'

export function scanHeld(
  buffer: ToolHeldBuffer,
  candidates: readonly ToolCandidate[],
  final: boolean,
) {
  const remaining = (index: number) => buffer.text.length - index
  const holdAt = (index: number) =>
    !final &&
    [...candidates, TOOL_MARKER].some(
      (candidate) =>
        (candidate.value.length > remaining(index) ||
          (candidate === TOOL_MARKER &&
            candidate.value.length === remaining(index))) &&
        agrees(buffer, candidate, index, remaining(index)),
    )
  const matchAt = (index: number) => {
    const end = runEnd(buffer, index)
    const complete = (candidate: ToolCandidate) =>
      candidate.value.length <= remaining(index) &&
      (end === index || index + candidate.value.length > end) &&
      agrees(buffer, candidate, index, candidate.value.length)
    const secret = candidates.find(complete)
    if (
      complete(TOOL_MARKER) &&
      (!secret || secret.value.length <= TOOL_MARKER.value.length)
    )
      return TOOL_MARKER.value.length
    return secret?.value.length ?? 0
  }
  let output = '',
    index = 0
  while (index < buffer.text.length) {
    if (holdAt(index)) break
    const length = matchAt(index)
    if (length) {
      output += TOOL_MARKER.value
      index += length
    } else if (runEnd(buffer, index) > index) {
      let next = index + 1
      const end = runEnd(buffer, index)
      while (next < end && !holdAt(next) && !matchAt(next)) next++
      output += TOOL_MARKER.value
      index = next
    } else {
      const point = String.fromCodePoint(
        buffer.text.codePointAt(index) ?? 0xfffd,
      )
      output += point
      index += point.length
    }
  }
  return { output, held: sliceHeld(buffer, index) }
}

/** Matching memory follows the unfinished end, not the complete source length. */
export async function* scanToolText(
  blocks:
    AsyncIterable<string | ToolHeldBuffer> | Iterable<string | ToolHeldBuffer>,
  candidates: readonly ToolCandidate[],
  state: ToolHeldState,
  final: boolean,
) {
  let buffer = heldBuffer(state)
  for await (const block of blocks) {
    const result = scanHeld(joinHeld(buffer, block), candidates, false)
    buffer = result.held
    yield* toolTextBlocks(result.output)
  }
  const result = scanHeld(buffer, candidates, final)
  if (result.held.runs.length)
    result.held.entries = crossingEntries(
      result.held,
      heldCandidates(result.held, candidates),
    )
  saveHeldBuffer(state, result.held)
  yield* toolTextBlocks(result.output)
}
