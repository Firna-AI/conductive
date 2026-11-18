import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { RunnerToolDetailPart } from '../../src/shared/generated/RunnerToolDetailPart'
import { TOOL_DETAIL_MAX_BYTES } from '../../src/shared/chat-events'
import { jsonBytes } from '../../src/shared/event-limits'
import { scanSecretText, filterSecretText } from '../../src/shared/secret-text'
import type { AppEnv } from '../env'
import { counter, invalidInput } from './inputs'
import type { FilteredRunnerOutput } from './runner-output'
import type { ChatTransaction } from './store'
import {
  readToolDetail,
  saveToolDetail,
  type ToolDetailState,
} from './tool-detail-records'

const encoder = new TextEncoder()

/** Keep only the displayed filtered prefix and the suffix needed for exact matching. */
export async function filterToolDetail(
  env: AppEnv,
  transaction: ChatTransaction,
  input: RunnerEventEnvelope & { event: RunnerToolDetailPart },
  activeValues: ReadonlySet<string>,
): Promise<FilteredRunnerOutput> {
  const part = input.event
  let state: ToolDetailState
  if (part.partNumber === 1) {
    if (!part.start) return invalidInput()
    state = {
      sessionId: part.start.sessionId,
      turnId: part.start.turnId,
      tool: { ...part.start.tool, detail: null },
      occurredAt: input.occurredAt,
      through: input.eventNumber - 1,
      partNumber: 0,
      prefix: '',
      prefixBytes: 2,
      closed: false,
      held: '',
      values: [...activeValues].filter(Boolean),
    }
  } else {
    const saved = await readToolDetail(env, transaction, input.streamId)
    if (!saved) return invalidInput()
    state = saved
  }
  state.values = [...new Set([...state.values, ...activeValues])].filter(
    Boolean,
  )
  if (
    state.through + 1 !== input.eventNumber ||
    state.partNumber + 1 !== part.partNumber
  )
    return invalidInput()
  const emit = (text: string) => {
    for (const point of text) {
      const bytes = jsonBytes(point) - 2
      if (state.closed || state.prefixBytes + bytes > TOOL_DETAIL_MAX_BYTES) {
        state.closed = true
        state.tool.omittedDetailBytes = counter(
          state.tool.omittedDetailBytes + encoder.encode(point).byteLength,
        )
      } else {
        state.prefix += point
        state.prefixBytes += bytes
      }
    }
  }
  state.held = scanSecretText(
    state.held + part.detail.replace(/[\uD800-\uDFFF]/gu, '\uFFFD'),
    part.finalPart,
    state.values,
    emit,
  )
  state.through = input.eventNumber
  state.partNumber = part.partNumber
  const event = {
    type: 'tool.updated' as const,
    sessionId: state.sessionId,
    turnId: state.turnId,
    tool: {
      ...state.tool,
      target: part.finalPart
        ? filterSecretText(state.tool.target, true, state.values).text
        : state.tool.target,
      detail: state.prefix,
    },
  }
  return {
    events: part.finalPart
      ? [{ ...input, occurredAt: state.occurredAt, event }]
      : [],
    privateContext: event,
    save: () =>
      saveToolDetail(
        env,
        transaction,
        input.streamId,
        part.finalPart ? undefined : state,
      ),
  }
}
