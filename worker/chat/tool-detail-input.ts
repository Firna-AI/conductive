import type { RunnerToolDetailPart } from '../../src/shared/generated/RunnerToolDetailPart'
import { parseAgentEvent } from './agent-events'
import { counter, invalidInput, record, string } from './inputs'

export function parseToolDetailPart(
  value: unknown,
): RunnerToolDetailPart | null {
  const input = record(value)
  if (input.type !== 'tool.detail.part') return null
  const partNumber = counter(input.partNumber)
  if (partNumber === 0 || typeof input.finalPart !== 'boolean')
    return invalidInput()
  const event =
    input.start === undefined
      ? undefined
      : parseAgentEvent({
          ...record(input.start),
          type: 'tool.updated',
        })
  if (event && event.type !== 'tool.updated') return invalidInput()
  return {
    type: input.type,
    ...(event?.type === 'tool.updated'
      ? {
          start: {
            sessionId: event.sessionId,
            turnId: event.turnId,
            tool: event.tool,
          },
        }
      : {}),
    detail: string(input.detail),
    partNumber,
    finalPart: input.finalPart,
  }
}
