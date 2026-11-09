import {
  TOOL_DETAIL_MAX_BYTES,
  TURN_COMPLETED_FILES_MAX_BYTES,
  TURN_COMPLETED_MAX_FILES,
} from '../../src/shared/chat-events'
import type { RunnerEvent } from '../../src/shared/runner'

export function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function toolDetail(detail: string | null) {
  if (detail === null) return { detail, omittedDetailBytes: 0 }
  const normalized = detail.replace(/[\uD800-\uDFFF]/gu, '\uFFFD')
  if (jsonBytes(normalized) <= TOOL_DETAIL_MAX_BYTES)
    return { detail: normalized, omittedDetailBytes: 0 }
  let bytes = 2
  let keptBytes = 0
  let end = 0
  for (const point of normalized) {
    const next = jsonBytes(point) - 2
    if (bytes + next > TOOL_DETAIL_MAX_BYTES) break
    bytes += next
    keptBytes += Buffer.byteLength(point, 'utf8')
    end += point.length
  }
  return {
    detail: normalized.slice(0, end),
    omittedDetailBytes: Buffer.byteLength(normalized, 'utf8') - keptBytes,
  }
}

function uniquePaths<T extends { path: string }>(items: readonly T[]): T[] {
  const paths = new Set<string>()
  return items.filter(({ path }) => {
    if (paths.has(path)) return false
    paths.add(path)
    return true
  })
}

/** Apply excerpts only after complete-source secret filtering. */
export function boundChatEvent(event: RunnerEvent): RunnerEvent {
  if (event.type === 'tool.updated')
    return {
      ...event,
      tool: { ...event.tool, ...toolDetail(event.tool.detail) },
    }
  if (event.type !== 'turn.completed') return event
  const all = uniquePaths(event.files)
  const files: typeof all = []
  let bytes = 2
  for (const file of all) {
    const next = jsonBytes(file) + (files.length ? 1 : 0)
    if (
      files.length === TURN_COMPLETED_MAX_FILES ||
      bytes + next > TURN_COMPLETED_FILES_MAX_BYTES
    )
      break
    files.push(file)
    bytes += next
  }
  return { ...event, files, omittedFileCount: all.length - files.length }
}
