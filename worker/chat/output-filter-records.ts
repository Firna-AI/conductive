import type { HeldOutput } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { decrypt, encrypt } from '../security/crypto'
import type { ChatTransaction } from './store'
import { array, parseAgentEvent } from './agent-events'
import { counter, record, string, strings } from './inputs'
import { prepareOutputState } from './output-filter-state'

function parseHeld(value: unknown): HeldOutput[] {
  return array(value, (entry) => {
    const input = record(entry)
    const event = parseAgentEvent(input.event)
    if (event.type !== 'assistant.delta') throw new Error('Invalid held output')
    if (input.symbolic !== undefined) {
      const state = record(input.symbolic)
      const matches =
        state.matches === undefined ? undefined : record(state.matches)
      return {
        event,
        secrets: [],
        symbolic: {
          salt: string(state.salt),
          contexts: array(state.contexts, (value) => {
            const context = record(value)
            return {
              identity: string(context.identity),
              matched: counter(context.matched),
            }
          }),
          ...(matches
            ? {
                matches: {
                  runs: array(matches.runs, (value) => {
                    const run = record(value)
                    return {
                      offset: counter(run.offset),
                      length: counter(run.length),
                    }
                  }),
                  entries: array(matches.entries, (value) => {
                    const entry = record(value)
                    return {
                      offset: counter(entry.offset),
                      identity: string(entry.identity),
                      ...(entry.start === undefined
                        ? {}
                        : { start: counter(entry.start) }),
                    }
                  }),
                },
              }
            : {}),
        },
      }
    }
    return {
      event,
      secrets: strings(input.secrets),
      ...(input.contexts === undefined
        ? {}
        : {
            contexts: array(input.contexts, (value) => {
              const context = record(value)
              return {
                text: string(context.text),
                secrets: strings(context.secrets),
              }
            }),
          }),
    }
  })
}

function encryptionContext(workspaceId: string, streamId: string | null) {
  return streamId === null
    ? JSON.stringify(['runner-output-context', workspaceId])
    : JSON.stringify(['runner-output', workspaceId, streamId])
}

export async function readOutputSnapshot(
  env: AppEnv,
  view: ChatTransaction,
  workspaceId: string,
  streamId: string | null,
): Promise<HeldOutput[]> {
  const ciphertext =
    streamId === null
      ? await view.output.readContexts()
      : await view.output.read(streamId)
  return ciphertext
    ? parseHeld(
        JSON.parse(
          await decrypt(
            ciphertext,
            encryptionContext(workspaceId, streamId),
            env.BOAT_KEY_ENCRYPTION_KEY,
          ),
        ),
      )
    : []
}

export async function saveOutputSnapshot(
  env: AppEnv,
  view: ChatTransaction,
  workspaceId: string,
  streamId: string | null,
  snapshot: readonly HeldOutput[],
) {
  const ciphertext = snapshot.length
    ? await encrypt(
        JSON.stringify(snapshot),
        encryptionContext(workspaceId, streamId),
        env.BOAT_KEY_ENCRYPTION_KEY,
      )
    : undefined
  if (streamId === null) await view.output.saveContexts(ciphertext)
  else await view.output.save(streamId, ciphertext)
}

export async function pruneSavedOutputSecrets(
  env: AppEnv,
  view: ChatTransaction,
  active: ReadonlySet<string>,
  before: ReadonlySet<string> = active,
) {
  for (const streamId of [null, ...(await view.output.streams())]) {
    const snapshot = await readOutputSnapshot(
      env,
      view,
      view.workspaceId,
      streamId,
    )
    const { snapshot: current } = await prepareOutputState(
      env,
      view.workspaceId,
      snapshot,
      active,
      before,
    )
    if (JSON.stringify(snapshot) !== JSON.stringify(current))
      await saveOutputSnapshot(env, view, view.workspaceId, streamId, current)
  }
}
