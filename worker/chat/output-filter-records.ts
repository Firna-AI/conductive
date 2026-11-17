import type { HeldOutput } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { decrypt, encrypt } from '../security/crypto'
import type { ChatTransaction } from './store'
import { array, parseAgentEvent } from './agent-events'
import { record, string, strings } from './inputs'

function parseHeld(value: unknown): HeldOutput[] {
  return array(value, (entry) => {
    const input = record(entry)
    const event = parseAgentEvent(input.event)
    if (event.type !== 'assistant.delta') throw new Error('Invalid held output')
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

export function retainActiveSecrets(
  snapshot: readonly HeldOutput[],
  active: ReadonlySet<string>,
): HeldOutput[] {
  return snapshot
    .map((held) => ({
      ...held,
      secrets: held.secrets.filter((value) => active.has(value)),
      contexts: held.contexts
        ?.map((context) => ({
          ...context,
          secrets: context.secrets.filter((value) => active.has(value)),
        }))
        .filter((context) => context.secrets.length),
    }))
    .filter((held) => held.event.text || held.contexts?.length)
}

export async function pruneSavedOutputSecrets(
  env: AppEnv,
  view: ChatTransaction,
  active: ReadonlySet<string>,
) {
  for (const streamId of [null, ...(await view.output.streams())]) {
    const snapshot = await readOutputSnapshot(
      env,
      view,
      view.workspaceId,
      streamId,
    )
    const current = retainActiveSecrets(snapshot, active)
    if (JSON.stringify(snapshot) !== JSON.stringify(current))
      await saveOutputSnapshot(env, view, view.workspaceId, streamId, current)
  }
}
