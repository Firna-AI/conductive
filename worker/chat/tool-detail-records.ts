import type { ToolCall } from '../../src/shared/generated/ToolCall'
import type { AppEnv } from '../env'
import { decrypt, encrypt } from '../security/crypto'
import { parseAgentEvent } from './agent-events'
import { counter, number, record, string } from './inputs'
import type { ChatTransaction } from './store'
import { readHeldMatches, type ToolHeldState } from './tool-detail-held'

export interface ToolDetailState extends ToolHeldState {
  sessionId: string
  turnId: string
  tool: ToolCall
  occurredAt: number
  through: number
  partNumber: number
  sourceGeneration: number
  sourceChunks: number
  matchSalt?: string
}

export type ToolDetailOwner = Pick<ChatTransaction, 'output' | 'workspaceId'>

export function toolDetailContext(workspaceId: string, streamId: string) {
  return JSON.stringify(['runner-tool-detail', workspaceId, streamId])
}

export async function readToolDetail(
  env: AppEnv,
  transaction: ToolDetailOwner,
  streamId: string,
): Promise<ToolDetailState | undefined> {
  const ciphertext = await transaction.output.readTool(streamId)
  if (!ciphertext) return undefined
  const input = record(
    JSON.parse(
      await decrypt(
        ciphertext,
        toolDetailContext(transaction.workspaceId, streamId),
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
    sourceGeneration: counter(input.sourceGeneration),
    sourceChunks: counter(input.sourceChunks),
    held: string(input.held),
    heldMatches: readHeldMatches(input.heldMatches),
    matchSalt:
      input.matchSalt === undefined ? undefined : string(input.matchSalt),
  }
}

export async function saveToolDetail(
  env: AppEnv,
  transaction: ToolDetailOwner,
  streamId: string,
  state: ToolDetailState | undefined,
): Promise<void> {
  await transaction.output.saveTool(
    streamId,
    state
      ? await encrypt(
          JSON.stringify(state),
          toolDetailContext(transaction.workspaceId, streamId),
          env.BOAT_KEY_ENCRYPTION_KEY,
        )
      : undefined,
    state ? { sessionId: state.sessionId, turnId: state.turnId } : undefined,
  )
}
