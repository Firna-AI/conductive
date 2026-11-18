import type { ToolCall } from '../../src/shared/generated/ToolCall'
import type { AppEnv } from '../env'
import { decrypt, encrypt } from '../security/crypto'
import { parseAgentEvent } from './agent-events'
import { counter, number, record, string, strings } from './inputs'
import type { ChatTransaction } from './store'

export interface ToolDetailState {
  sessionId: string
  turnId: string
  tool: ToolCall
  occurredAt: number
  through: number
  partNumber: number
  prefix: string
  prefixBytes: number
  closed: boolean
  held: string
  values: string[]
}

function context(workspaceId: string, streamId: string) {
  return JSON.stringify(['runner-tool-detail', workspaceId, streamId])
}

export async function readToolDetail(
  env: AppEnv,
  transaction: ChatTransaction,
  streamId: string,
): Promise<ToolDetailState | undefined> {
  const ciphertext = await transaction.output.readTool(streamId)
  if (!ciphertext) return undefined
  const input = record(
    JSON.parse(
      await decrypt(
        ciphertext,
        context(transaction.workspaceId, streamId),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    ),
  )
  const event = parseAgentEvent({ ...input, type: 'tool.updated' })
  if (event.type !== 'tool.updated')
    throw new Error('Invalid tool source state')
  return {
    sessionId: event.sessionId,
    turnId: event.turnId,
    tool: event.tool,
    occurredAt: number(input.occurredAt),
    through: counter(input.through),
    partNumber: counter(input.partNumber),
    prefix: string(input.prefix),
    prefixBytes: counter(input.prefixBytes),
    closed: input.closed === true,
    held: string(input.held),
    values: strings(input.values),
  }
}

export async function saveToolDetail(
  env: AppEnv,
  transaction: ChatTransaction,
  streamId: string,
  state: ToolDetailState | undefined,
): Promise<void> {
  await transaction.output.saveTool(
    streamId,
    state
      ? await encrypt(
          JSON.stringify(state),
          context(transaction.workspaceId, streamId),
          env.BOAT_KEY_ENCRYPTION_KEY,
        )
      : undefined,
    state ? { sessionId: state.sessionId, turnId: state.turnId } : undefined,
  )
}
