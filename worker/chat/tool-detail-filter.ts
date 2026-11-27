import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { RunnerToolDetailPart } from '../../src/shared/generated/RunnerToolDetailPart'
import { TOOL_DETAIL_MAX_BYTES } from '../../src/shared/chat-events'
import { jsonBytes } from '../../src/shared/event-limits'
import { filterSecretText } from '../../src/shared/secret-text'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { counter, invalidInput } from './inputs'
import type { FilteredRunnerOutput } from './runner-output'
import type { ChatTransaction } from './store'
import {
  readToolDetail,
  saveToolDetail,
  type ToolDetailState,
} from './tool-detail-records'
import {
  appendToolDetailSource,
  readToolDetailSource,
  toolTextBlocks,
} from './tool-detail-source'
import { heldBuffer } from './tool-detail-held'
import { toolCandidates } from './tool-detail-identity'
import { scanToolText } from './tool-detail-scan'

const encoder = new TextEncoder()

/** Retain arrival masks, then rescan the complete source before its only cut. */
export async function filterToolDetail(
  env: AppEnv,
  transaction: ChatTransaction,
  input: RunnerEventEnvelope & { event: RunnerToolDetailPart },
  activeValues: ReadonlySet<string>,
): Promise<FilteredRunnerOutput> {
  const part = input.event
  const values = [...activeValues]
  let state: ToolDetailState
  if (part.partNumber === 1) {
    if (!part.start) return invalidInput()
    state = {
      sessionId: part.start.sessionId,
      turnId: part.start.turnId,
      tool: {
        ...part.start.tool,
        detail: null,
        target: filterSecretText(part.start.tool.target, true, values).text,
      },
      occurredAt: input.occurredAt,
      through: input.eventNumber - 1,
      partNumber: 0,
      sourceGeneration: 0,
      sourceChunks: 0,
      held: '',
      matchSalt: randomToken(),
    }
  } else {
    const saved = await readToolDetail(env, transaction, input.streamId)
    if (!saved) return invalidInput()
    state = saved
  }
  if (
    state.through + 1 !== input.eventNumber ||
    state.partNumber + 1 !== part.partNumber
  )
    return invalidInput()
  state.matchSalt ??= randomToken()
  const candidates = await toolCandidates(
    env,
    transaction.workspaceId,
    input.streamId,
    state.matchSalt,
    values,
  )
  const arrival = () =>
    scanToolText(
      toolTextBlocks(part.detail.replace(/[\uD800-\uDFFF]/gu, '\uFFFD')),
      candidates,
      state,
      false,
    )
  let detail = ''
  let prefixBytes = 2
  let closed = false
  let omitted = state.tool.omittedDetailBytes
  if (part.finalPart) {
    const complete = async function* () {
      yield* readToolDetailSource(env, transaction, input.streamId, state)
      yield heldBuffer(state)
      yield* toolTextBlocks(part.detail.replace(/[\uD800-\uDFFF]/gu, '\uFFFD'))
    }
    for await (const text of scanToolText(
      complete(),
      candidates,
      { held: '' },
      true,
    )) {
      for (const point of text) {
        const bytes = jsonBytes(point) - 2
        if (closed || prefixBytes + bytes > TOOL_DETAIL_MAX_BYTES) {
          closed = true
          omitted = counter(omitted + encoder.encode(point).byteLength)
        } else {
          detail += point
          prefixBytes += bytes
        }
      }
    }
  }
  state.through = input.eventNumber
  state.partNumber = part.partNumber
  const event = {
    type: 'tool.updated' as const,
    sessionId: state.sessionId,
    turnId: state.turnId,
    tool: {
      ...state.tool,
      target:
        part.finalPart && part.partNumber !== 1
          ? filterSecretText(state.tool.target, true, values).text
          : state.tool.target,
      detail,
      omittedDetailBytes: omitted,
    },
  }
  return {
    events: part.finalPart
      ? [{ ...input, occurredAt: state.occurredAt, event }]
      : [],
    privateContext: event,
    filterLabel: (text) => filterSecretText(text, true, values).text,
    save: async () => {
      if (part.finalPart) {
        await saveToolDetail(env, transaction, input.streamId, undefined)
      } else {
        if (part.partNumber === 1)
          await transaction.output.saveTool(input.streamId, undefined)
        await appendToolDetailSource(
          env,
          transaction,
          input.streamId,
          state,
          arrival(),
        )
        await saveToolDetail(env, transaction, input.streamId, state)
      }
    },
  }
}
