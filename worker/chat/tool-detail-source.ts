import type { AppEnv } from '../env'
import { decrypt, encrypt } from '../security/crypto'
import { counter } from './inputs'
import type { ToolDetailOwner, ToolDetailState } from './tool-detail-records'

const SOURCE_CHARACTERS = 16_384

/** Slice on scalar boundaries, including when a stored marker spans records. */
export function* toolTextBlocks(text: string) {
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + SOURCE_CHARACTERS, text.length)
    const last = text.charCodeAt(end - 1)
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--
    yield text.slice(start, end)
    start = end
  }
}

function context(
  workspaceId: string,
  streamId: string,
  generation: number,
  index: number,
) {
  return JSON.stringify([
    'runner-tool-source',
    workspaceId,
    streamId,
    generation,
    index,
  ])
}

export async function* readToolDetailSource(
  env: AppEnv,
  owner: ToolDetailOwner,
  streamId: string,
  state: ToolDetailState,
) {
  for (let index = 0; index < state.sourceChunks; index++) {
    const ciphertext = await owner.output.toolSources.read(
      streamId,
      state.sourceGeneration,
      index,
    )
    yield await decrypt(
      ciphertext,
      context(owner.workspaceId, streamId, state.sourceGeneration, index),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
  }
}

export async function appendToolDetailSource(
  env: AppEnv,
  owner: ToolDetailOwner,
  streamId: string,
  state: ToolDetailState,
  blocks: AsyncIterable<string>,
) {
  for await (const block of blocks) {
    const index = state.sourceChunks
    const ciphertext = await encrypt(
      block,
      context(owner.workspaceId, streamId, state.sourceGeneration, index),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await owner.output.toolSources.save(
      streamId,
      state.sourceGeneration,
      index,
      ciphertext,
    )
    state.sourceChunks = counter(index + 1)
  }
}
