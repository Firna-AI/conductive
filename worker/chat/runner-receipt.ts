import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type {
  PublishWorkspaceEvents,
  WorkspaceEventEnvelope,
} from './workspace-events'
import { HttpError } from '../http'
import { InvalidRunnerReport } from '../files/errors'
import { RunnerFileReports } from '../files/runner-reports'
import {
  parseRunnerEnvelope,
  parseRunnerOutputEnvelope,
  type IncomingRunnerEnvelope,
} from './runner-input'
import { refuseRunnerEvent } from './runner-refusal'
import type { ChatStore, ChatTransaction } from './store'
import { prepareAgentEvent } from './turn-events'
import { observeRepairPart } from './repair-refusal'
import { storeWorkspaceTitle } from './workspace-title'
import type { ChatDependencies, RunnerWorkspaceRecord } from './types'
import type { FilteredRunnerOutput } from './runner-output'
import { invalidInput } from './inputs'
import { presentCompleteChanges } from './browser-changes'

interface ReceiptPublication {
  needsCompleteChanges(): boolean
  publish: PublishWorkspaceEvents
}

export function commitRunnerReceipt(
  store: ChatStore,
  workspace: RunnerWorkspaceRecord,
  message: IncomingRunnerEnvelope,
  dependencies: ChatDependencies,
  publication: ReceiptPublication,
) {
  let completeChanges: WorkspaceEventEnvelope | undefined
  return store.change(
    workspace.id,
    async (transaction) => {
      completeChanges = undefined
      const cursor = await transaction.cursor(message.streamId)
      if (message.eventNumber !== cursor + 1)
        return { cursor, ready: false, stored: [] }
      const receipt = await storeRunnerReceipt(
        transaction,
        workspace,
        message,
        dependencies,
      )
      const delta = receipt.stored.find(
        ({ event }) => event.type === 'changes.changed',
      )
      if (delta && publication.needsCompleteChanges())
        completeChanges =
          (await presentCompleteChanges(transaction.files, delta)) ?? undefined
      await transaction.saveCursor(message.streamId, message.eventNumber)
      return { ...receipt, cursor: message.eventNumber }
    },
    (events) => publication.publish(events, completeChanges),
  )
}

/** Only validation errors become permanent refusals. Storage and sends must retry. */
async function storeRunnerReceipt(
  transaction: ChatTransaction,
  workspace: RunnerWorkspaceRecord,
  message: IncomingRunnerEnvelope,
  dependencies: ChatDependencies,
): Promise<{ ready: boolean; stored: WorkspaceEventEnvelope[] }> {
  const stored: WorkspaceEventEnvelope[] = []
  const { randomId } = dependencies
  let parsed: RunnerEventEnvelope
  try {
    parsed = parseRunnerEnvelope(message)
  } catch (error) {
    await refuseInvalid(transaction, message, error, randomId)
    return { ready: false, stored: [transaction.emitted[0]] }
  }
  let filtered: FilteredRunnerOutput
  try {
    filtered = await dependencies.filterRunnerOutput(
      transaction,
      workspace,
      parsed,
    )
  } catch (error) {
    await refuseInvalid(transaction, message, error, randomId)
    return { ready: false, stored: [transaction.emitted[0]] }
  }
  let ready = false
  let accepted = false
  const context =
    filtered.privateContext ??
    (parsed.event.type === 'assistant.delta'
      ? { ...parsed.event, text: '' }
      : undefined)
  if (!filtered.events.length && context) {
    try {
      await prepareAgentEvent(transaction, context, parsed.occurredAt, randomId)
      accepted = true
    } catch (error) {
      await refuseSemantic(transaction, message, error, randomId)
      return { ready: false, stored: [transaction.emitted[0]] }
    }
  }
  for (const candidate of filtered.events) {
    const first = transaction.emitted.length
    let output: RunnerEventEnvelope
    try {
      output = parseRunnerOutputEnvelope(candidate)
    } catch (error) {
      await refuseInvalid(transaction, message, error, randomId)
      stored.push(...transaction.emitted.slice(first))
      break
    }
    const result = await applyRunnerEvent(
      transaction,
      message,
      output,
      randomId,
      dependencies.readAutomaticTitleWorkspace,
    )
    ready ||= result.ready
    accepted ||= result.accepted
    const emitted = transaction.emitted
      .slice(first)
      .find(
        (envelope) =>
          envelope.event.type === output.event.type ||
          envelope.event.type === 'runner.event-refused',
      )
    if (emitted) stored.push(emitted)
    if (!result.accepted) break
  }
  if (accepted) await filtered.save()
  return { ready, stored }
}

async function refuseInvalid(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  error: unknown,
  randomId: () => string,
) {
  if (
    !(error instanceof HttpError) ||
    (error.code !== 'invalid_input' && error.code !== 'runner_event_too_large')
  )
    throw error
  await refuseRunnerEvent(
    transaction,
    message,
    error.code === 'runner_event_too_large' ? 'too_large' : 'invalid',
    randomId,
  )
}

async function refuseSemantic(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  error: unknown,
  randomId: () => string,
) {
  if (!(error instanceof HttpError)) throw error
  const inactive =
    error.code === 'runner_turn_mismatch' || error.code === 'session_not_found'
  if (
    !inactive &&
    error.code !== 'runner_sender_mismatch' &&
    error.code !== 'runner_message_mismatch' &&
    error.code !== 'session_agent_mismatch'
  )
    throw error
  await refuseRunnerEvent(
    transaction,
    message,
    inactive ? 'turn_not_active' : 'invalid',
    randomId,
  )
}

async function applyRunnerEvent(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  parsed: RunnerEventEnvelope,
  randomId: () => string,
  readWorkspace: ChatDependencies['readAutomaticTitleWorkspace'],
): Promise<{ ready: boolean; accepted: boolean }> {
  const event = parsed.event
  if (event.type === 'tool.detail.part') return invalidInput()
  let apply: (() => Promise<void>) | undefined
  if ('sessionId' in event) {
    try {
      apply = await prepareAgentEvent(
        transaction,
        event,
        parsed.occurredAt,
        randomId,
      )
    } catch (error) {
      await refuseSemantic(transaction, message, error, randomId)
      return { ready: false, accepted: false }
    }
  }
  if (event.type === 'runner.ready') {
    await transaction.saveStreamReady(message.streamId)
    await transaction.skills.ready(message.streamId, parsed.occurredAt)
    return { ready: true, accepted: true }
  }
  if (
    event.type === 'files.snapshot' ||
    event.type === 'files.unavailable' ||
    event.type === 'files.changed' ||
    event.type === 'changes.updated' ||
    event.type === 'changes.changed'
  ) {
    try {
      const complete = await new RunnerFileReports(transaction.files).accept(
        event,
      )
      if (complete) {
        await transaction.emit(complete, parsed.occurredAt)
        if (
          complete.type === 'files.snapshot' ||
          complete.type === 'changes.updated'
        )
          await transaction.repairs.remove(complete.type)
      } else await observeRepairPart(transaction, message.streamId, event)
    } catch (error) {
      if (!(error instanceof InvalidRunnerReport)) throw error
      await refuseRunnerEvent(transaction, message, 'invalid', randomId)
      return { ready: false, accepted: false }
    }
  } else if (apply) {
    await apply()
  } else if (event.type === 'skills.updated') {
    await transaction.skills.report(message.streamId, event, parsed.occurredAt)
    await transaction.repairs.remove(event.type)
  } else if (!('sessionId' in event)) {
    if (event.type === 'workspace.title')
      await storeWorkspaceTitle(
        transaction,
        event,
        readWorkspace,
        parsed.occurredAt,
      )
    else await transaction.emit(event, parsed.occurredAt)
    if (event.type === 'start.updated' || event.type === 'ports.updated')
      await transaction.repairs.remove(event.type)
  }
  return { ready: false, accepted: true }
}
