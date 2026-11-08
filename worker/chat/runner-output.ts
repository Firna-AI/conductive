import { boundChatEvent } from '../../src/shared/event-limits'
import {
  OutputSanitizer,
  type HeldOutput,
} from '../../src/shared/output-sanitizer'
import type { RunnerEventEnvelope } from '../../src/shared/runner'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import { decrypt, encrypt } from '../security/crypto'
import { parseAgentEvent } from './agent-events'
import { record, string, strings } from './inputs'
import type { ChatTransaction } from './store'
import type { RunnerWorkspaceRecord } from './types'

export interface FilteredRunnerOutput {
  events: RunnerEventEnvelope[]
  save(): Promise<void>
}

function parseHeld(value: unknown): HeldOutput[] {
  if (!Array.isArray(value)) throw new Error('Invalid output filter state')
  return value.map((entry: unknown) => {
    const input = record(entry)
    const event = parseAgentEvent(input.event)
    if (event.type !== 'assistant.delta') throw new Error('Invalid held output')
    return { event, secrets: strings(input.secrets).map(string) }
  })
}

/** Restore per-receipt state so a failed transaction cannot consume held text. */
export async function filterRunnerOutput(
  env: AppEnv,
  transaction: ChatTransaction,
  workspace: RunnerWorkspaceRecord,
  input: RunnerEventEnvelope,
): Promise<FilteredRunnerOutput> {
  const context = JSON.stringify([
    'runner-output',
    workspace.id,
    input.streamId,
  ])
  const saved = await transaction.output.read(input.streamId)
  const pending = saved
    ? parseHeld(
        JSON.parse(await decrypt(saved, context, env.BOAT_KEY_ENCRYPTION_KEY)),
      )
    : []
  const sanitizer = new OutputSanitizer(pending)
  for (const secret of await runningOutputSecrets(env, workspace))
    sanitizer.add(secret)
  const events = sanitizer
    .accept(input.event)
    .map((event) => ({ ...input, event: boundChatEvent(event) }))
  return {
    events,
    save: async () => {
      const held = sanitizer.snapshot()
      await transaction.output.save(
        input.streamId,
        held.length
          ? await encrypt(
              JSON.stringify(held),
              context,
              env.BOAT_KEY_ENCRYPTION_KEY,
            )
          : undefined,
      )
    },
  }
}
