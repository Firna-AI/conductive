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
import {
  readOutputSnapshot,
  saveOutputSnapshot,
  retainActiveSecrets,
} from './output-filter-records'

export interface FilteredRunnerOutput {
  events: RunnerEventEnvelope[]
  privateContext?: AgentChatEvent
  save(): Promise<void>
}

function unreleased(snapshot: readonly HeldOutput[]): HeldOutput[] {
  return snapshot.flatMap(({ event, secrets }) =>
    event.text ? [{ event, secrets }] : [],
  )
}

function released(snapshot: readonly HeldOutput[]): HeldOutput[] {
  return snapshot.flatMap(({ event, contexts }) =>
    contexts?.length
      ? [{ event: { ...event, text: '' }, secrets: [], contexts }]
      : [],
  )
}

function combine(snapshot: readonly HeldOutput[]): HeldOutput[] {
  const answers = new Map<string, HeldOutput>()
  for (const held of snapshot) {
    const { event } = held
    const key = JSON.stringify([event.sessionId, event.turnId, event.messageId])
    const previous = answers.get(key)
    const contexts = new Map<
      string,
      NonNullable<HeldOutput['contexts']>[number]
    >()
    for (const context of [
      ...(previous?.contexts ?? []),
      ...(held.contexts ?? []),
    ]) {
      contexts.set(context.text, {
        text: context.text,
        secrets: [
          ...new Set([
            ...(contexts.get(context.text)?.secrets ?? []),
            ...context.secrets,
          ]),
        ],
      })
    }
    answers.set(key, {
      event: previous?.event ?? event,
      secrets: [...new Set([...(previous?.secrets ?? []), ...held.secrets])],
      contexts: [...contexts.values()],
    })
  }
  return [...answers.values()]
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
      if (snapshot.some((held) => held.contexts?.length))
        legacy.push({ streamId, snapshot })
    }
  }
  const sanitizer = new OutputSanitizer(
    retainActiveSecrets(
      combine([
        ...pending,
        ...contexts,
        ...legacy.flatMap(({ snapshot }) => released(snapshot)),
      ]),
      activeValues,
    ),
  )
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
      await saveStream(input.streamId, unreleased(snapshot))
      for (const { streamId, snapshot } of legacy)
        await saveStream(streamId, unreleased(snapshot))
      await saveOutputSnapshot(
        env,
        transaction,
        workspace.id,
        null,
        released(snapshot),
      )
    },
  }
}
