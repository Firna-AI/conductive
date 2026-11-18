import { filterSecretText } from '../../src/shared/secret-text'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { counter } from './inputs'
import { eraseHeld, heldBuffer, saveHeldBuffer } from './tool-detail-held'
import { toolCandidates } from './tool-detail-identity'
import { agrees, crossingEntries, heldCandidates } from './tool-detail-match'
import {
  readToolDetail,
  saveToolDetail,
  type ToolDetailOwner,
  type ToolDetailState,
} from './tool-detail-records'
import { scanHeld, scanToolText } from './tool-detail-scan'
import {
  appendToolDetailSource,
  readToolDetailSource,
  toolTextBlocks,
} from './tool-detail-source'

/** Mask retained text and erase ended copies without finishing surviving matches. */
export async function maskOpenToolDetails(
  env: AppEnv,
  owner: ToolDetailOwner,
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
) {
  const values = [...before]
  for (const streamId of await owner.output.toolStreams()) {
    const saved = await readToolDetail(env, owner, streamId)
    if (!saved) continue
    const matchSalt = saved.matchSalt ?? randomToken()
    const state: ToolDetailState = {
      ...saved,
      tool: {
        ...saved.tool,
        target: filterSecretText(saved.tool.target, true, values).text,
      },
      held: '',
      heldMatches: undefined,
      matchSalt,
      sourceGeneration: counter(saved.sourceGeneration + 1),
      sourceChunks: 0,
    }
    const candidates = await toolCandidates(
      env,
      owner.workspaceId,
      streamId,
      matchSalt,
      [...new Set([...before, ...after])],
    )
    const previous = candidates.filter((candidate) =>
      before.has(candidate.value),
    )
    const remaining = candidates.filter((candidate) =>
      after.has(candidate.value),
    )
    const removed = previous.filter((candidate) => !after.has(candidate.value))
    const source = async function* () {
      yield* readToolDetailSource(env, owner, streamId, saved)
      yield heldBuffer(saved)
    }
    const masked = async function* () {
      yield* scanToolText(source(), previous, state, false)
      const held = heldBuffer(state)
      const found = heldCandidates(held, remaining)
      if (!found.some((entry) => entry.holdsEnd)) {
        const finished = scanHeld(held, previous, true)
        saveHeldBuffer(state, finished.held)
        yield* toolTextBlocks(finished.output)
        return
      }
      const spans = []
      for (const candidate of removed) {
        for (
          let offset = 0;
          offset + candidate.value.length <= held.text.length;
          offset++
        ) {
          if (agrees(held, candidate, offset, candidate.value.length))
            spans.push({ offset, length: candidate.value.length })
        }
      }
      const erased = eraseHeld(held, spans)
      erased.entries = crossingEntries(erased, found)
      saveHeldBuffer(state, erased)
    }
    await appendToolDetailSource(env, owner, streamId, state, masked())
    await saveToolDetail(env, owner, streamId, state)
    await owner.output.toolSources.clear(streamId, saved.sourceGeneration)
  }
}
