import { filterSecretText } from '../../src/shared/secret-text'
import type { AppEnv } from '../env'
import { counter } from './inputs'
import {
  readToolDetail,
  saveToolDetail,
  type ToolDetailOwner,
} from './tool-detail-records'
import {
  appendToolDetailSource,
  readToolDetailSource,
  scanToolText,
  toolTextBlocks,
} from './tool-detail-source'

/** Scan the full pre-change set once, before its secret records are removed. */
export async function maskOpenToolDetails(
  env: AppEnv,
  owner: ToolDetailOwner,
  active: ReadonlySet<string>,
) {
  const values = [...active]
  for (const streamId of await owner.output.toolStreams()) {
    const saved = await readToolDetail(env, owner, streamId)
    if (!saved) continue
    const state = {
      ...saved,
      tool: {
        ...saved.tool,
        target: filterSecretText(saved.tool.target, true, values).text,
      },
      held: '',
      sourceGeneration: counter(saved.sourceGeneration + 1),
      sourceChunks: 0,
    }
    const source = async function* () {
      yield* readToolDetailSource(env, owner, streamId, saved)
      yield* toolTextBlocks(saved.held)
    }
    await appendToolDetailSource(
      env,
      owner,
      streamId,
      state,
      scanToolText(source(), values, state, false),
    )
    await saveToolDetail(env, owner, streamId, state)
    await owner.output.toolSources.clear(streamId, saved.sourceGeneration)
  }
}
