import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { AgentChatEvent } from '../../src/shared/generated/AgentChatEvent'
import { boundChatEvent } from '../../src/shared/event-limits'
import {
  OutputSanitizer,
  type HeldOutput,
} from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import type { ChatTransaction } from './store'
import type { RunnerWorkspaceRecord } from './types'
import { displayPortReport } from './port-reports'
import { agentOutputSecrets } from '../secrets/output-values'
import { filterToolDetail } from './tool-detail-filter'
import { readOutputSnapshot, saveOutputSnapshot } from './output-filter-records'
import { prepareOutputState } from './output-filter-state'
import { releasedOutput, unreleasedOutput } from './output-filter-snapshot'

export interface FilteredRunnerOutput {
  events: RunnerEventEnvelope[]
  privateContext?: AgentChatEvent
  save(): Promise<void>
}

/** Restore per-receipt state so a failed transaction cannot consume held text. */
export async function filterRunnerOutput(
  env: AppEnv,
  transaction: ChatTransaction,
  workspace: RunnerWorkspaceRecord,
  input: RunnerEventEnvelope,
): Promise<FilteredRunnerOutput> {
  const activeValues = new Set([
    ...(await runningOutputSecrets(env, workspace)),
    ...(await agentOutputSecrets(
      env,
      transaction.secrets,
      workspace,
      transaction.now,
    )),
  ])
  if (input.event.type === 'tool.detail.part')
    return filterToolDetail(
      env,
      transaction,
      { ...input, event: input.event },
      activeValues,
    )
  await transaction.output.saveTool(input.streamId, undefined)
  const readStream = (streamId: string) =>
    readOutputSnapshot(env, transaction, workspace.id, streamId)
  const pending = await readStream(input.streamId)
  const saved = await transaction.output.readContexts()
  const contexts = await readOutputSnapshot(
    env,
    transaction,
    workspace.id,
    null,
  )
  const legacy: { streamId: string; snapshot: HeldOutput[] }[] = []
  if (!saved) {
    for (const streamId of await transaction.output.streams()) {
      if (streamId === input.streamId) continue
      const snapshot = await readStream(streamId)
      if (
        snapshot.some(
          (held) => held.symbolic?.contexts.length || held.contexts?.length,
        )
      )
        legacy.push({ streamId, snapshot })
    }
  }
  const prepared = await prepareOutputState(
    env,
    workspace.id,
    [
      ...pending,
      ...contexts,
      ...legacy.flatMap(({ snapshot }) => releasedOutput(snapshot)),
    ],
    activeValues,
  )
  const sanitizer = new OutputSanitizer(prepared.snapshot, prepared.matching)
  for (const secret of activeValues) sanitizer.add(secret)
  const events = sanitizer.accept(input.event).map((event) => ({
    ...input,
    event:
      event.type === 'ports.updated'
        ? displayPortReport(event)
        : boundChatEvent(event),
  }))
  return {
    events,
    save: async () => {
      const snapshot = sanitizer.snapshot()
      const saveStream = (streamId: string, held: HeldOutput[]) =>
        saveOutputSnapshot(env, transaction, workspace.id, streamId, held)
      await saveStream(input.streamId, unreleasedOutput(snapshot))
      for (const { streamId, snapshot } of legacy)
        await saveStream(streamId, unreleasedOutput(snapshot))
      await saveOutputSnapshot(
        env,
        transaction,
        workspace.id,
        null,
        releasedOutput(snapshot),
      )
    },
  }
}
