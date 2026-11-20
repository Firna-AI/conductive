import { counter, invalidInput, record, string } from './inputs'
import { TOOL_MARKER } from './tool-detail-identity'

interface UnknownRun {
  offset: number
  length: number
}
export interface MatchEntry {
  offset: number
  identity: string
}
export interface ToolHeldMatches {
  runs: UnknownRun[]
  entries: MatchEntry[]
}
export interface ToolHeldState {
  held: string
  heldMatches?: ToolHeldMatches
}
export interface ToolHeldBuffer extends ToolHeldMatches {
  text: string
}

export function readHeldMatches(input: unknown): ToolHeldMatches | undefined {
  if (input === undefined) return undefined
  const value = record(input)
  if (!Array.isArray(value.runs) || !Array.isArray(value.entries))
    return invalidInput()
  return {
    runs: value.runs.map((item: unknown) => {
      const run = record(item)
      return { offset: counter(run.offset), length: counter(run.length) }
    }),
    entries: value.entries.map((item: unknown) => {
      const entry = record(item)
      return { offset: counter(entry.offset), identity: string(entry.identity) }
    }),
  }
}

/** Offsets count logical UTF-16 units, before safe fallback markers replace runs. */
export function heldBuffer(state: ToolHeldState): ToolHeldBuffer {
  const { runs = [], entries = [] } = state.heldMatches ?? {}
  let text = '',
    physical = 0
  for (const run of runs) {
    const known = run.offset - text.length
    text += state.held.slice(physical, physical + known)
    physical += known + TOOL_MARKER.value.length
    text += '\0'.repeat(run.length)
  }
  return { text: text + state.held.slice(physical), runs, entries }
}

export function saveHeldBuffer(state: ToolHeldState, buffer: ToolHeldBuffer) {
  let text = '',
    from = 0
  for (const run of buffer.runs) {
    text += buffer.text.slice(from, run.offset) + TOOL_MARKER.value
    from = run.offset + run.length
  }
  state.held = text + buffer.text.slice(from)
  state.heldMatches = buffer.runs.length
    ? { runs: buffer.runs, entries: buffer.entries }
    : undefined
}

export function joinHeld(
  a: ToolHeldBuffer,
  b: string | ToolHeldBuffer,
): ToolHeldBuffer {
  if (typeof b === 'string') return { ...a, text: a.text + b }
  const offset = a.text.length
  return {
    text: a.text + b.text,
    runs: [
      ...a.runs,
      ...b.runs.map((run) => ({ ...run, offset: run.offset + offset })),
    ],
    entries: [
      ...a.entries,
      ...b.entries.map((entry) => ({
        ...entry,
        offset: entry.offset + offset,
      })),
    ],
  }
}

export function sliceHeld(
  buffer: ToolHeldBuffer,
  from: number,
): ToolHeldBuffer {
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
      .map((entry) => ({
        ...entry,
        offset: entry.offset - from,
      })),
  }
}

export function eraseHeld(
  buffer: ToolHeldBuffer,
  spans: UnknownRun[],
): ToolHeldBuffer {
  const runs: UnknownRun[] = []
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
