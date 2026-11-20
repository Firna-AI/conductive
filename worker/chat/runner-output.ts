import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { AgentChatEvent } from '../../src/shared/generated/AgentChatEvent'
import { boundChatEvent } from '../../src/shared/event-limits'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import type { ChatTransaction } from './store'
import type { RunnerWorkspaceRecord } from './types'
import { displayPortReport } from './port-reports'
import { displaySkillReport } from './skill-reports'
import { agentOutputSecrets } from '../secrets/output-values'
import { filterToolDetail } from './tool-detail-filter'
import { prepareOutputState } from './output-filter-state'
import { AnswerOutputRecords } from './output-answer-records'

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
  const records = new AnswerOutputRecords(env, transaction, workspace.id)
  await records.initialize(activeValues)
  const pending = await records.pending(input.streamId)
  const answers = records.affected(input.event, pending)
  const contexts = await records.contexts(answers)
  const prepared = await prepareOutputState(
    env,
    workspace.id,
    [...pending, ...contexts],
    activeValues,
  )
  const sanitizer = new OutputSanitizer(prepared.snapshot, prepared.matching)
  for (const secret of activeValues) sanitizer.add(secret)
  const events = sanitizer.accept(input.event).map((event) => ({
    ...input,
    event:
      event.type === 'ports.updated'
        ? displayPortReport(event)
        : event.type === 'skills.updated'
          ? displaySkillReport(event)
          : boundChatEvent(event),
  }))
  return {
    events,
    save: () =>
      records.save(input.streamId, sanitizer.snapshot(), answers, activeValues),
  }
}
