import { readToolSkills, type ToolCall } from '../../shared/chat-events'
import {
  count,
  nullable,
  oneOf,
  record,
  text,
  UnreadableResponse,
} from './json'

const readToolKind = oneOf<ToolCall['kind']>({
  read: true,
  search: true,
  create: true,
  edit: true,
  run: true,
  computer: true,
  other: true,
})
const readToolState = oneOf<ToolCall['state']>({
  running: true,
  done: true,
  stopped: true,
  failed: true,
})

/** The new count fields require whole, non-negative, safe integer values. */
export function safeCount(value: unknown): number {
  const result = count(value)
  if (!Number.isSafeInteger(result) || result < 0)
    throw new UnreadableResponse('count')
  return result
}

export function readTool(value: unknown): ToolCall {
  const source = record(value, 'tool')
  const skills = readToolSkills(source.skills)
  return {
    id: text(source.id),
    kind: readToolKind(source.kind),
    ...(skills === undefined ? {} : { skills }),
    target: text(source.target),
    detail: nullable(text)(source.detail),
    omittedDetailBytes: safeCount(source.omittedDetailBytes),
    state: readToolState(source.state),
  }
}
