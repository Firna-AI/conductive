import type { RunnerEventEnvelope } from '../../src/shared/runner'
import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { HttpError } from '../http'
import { InvalidRunnerReport, RunnerFileReports } from '../files/runner-reports'
import {
  parseRunnerEnvelope,
  type IncomingRunnerEnvelope,
} from './runner-input'
import { refuseRunnerEvent } from './runner-refusal'
import type { ChatTransaction } from './store'
import { prepareAgentEvent } from './turn-events'
import { observeRepairPart } from './repair-refusal'

/** Only validation errors become permanent refusals. Storage and sends must retry. */
export async function storeRunnerReceipt(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  randomId: () => string,
): Promise<{ ready: boolean; stored?: WorkspaceEventEnvelope }> {
  let parsed: RunnerEventEnvelope
  try {
    parsed = parseRunnerEnvelope(message)
  } catch (error) {
    if (
      !(error instanceof HttpError) ||
      (error.code !== 'invalid_input' &&
        error.code !== 'runner_event_too_large')
    )
      throw error
    await refuseRunnerEvent(
      transaction,
      message,
      error.code === 'runner_event_too_large' ? 'too_large' : 'invalid',
      randomId,
    )
    return { ready: false, stored: transaction.emitted[0] }
  }
  const event = parsed.event
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
      if (!(error instanceof HttpError)) throw error
      const inactive =
        error.code === 'runner_turn_mismatch' ||
        error.code === 'session_not_found'
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
      return { ready: false, stored: transaction.emitted[0] }
    }
  }
  if (event.type === 'runner.ready') {
    await transaction.saveStreamReady(message.streamId)
    return { ready: true }
  }
  if (
    event.type === 'files.snapshot' ||
    event.type === 'files.unavailable' ||
    event.type === 'files.changed' ||
    event.type === 'changes.updated'
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
    }
  } else if (apply) {
    await apply()
  } else if (!('sessionId' in event)) {
    await transaction.emit(event, parsed.occurredAt)
    if (event.type === 'start.updated' || event.type === 'workspace.title')
      await transaction.repairs.remove(event.type)
  }
  return {
    ready: false,
    stored: transaction.emitted.find(
      (envelope) =>
        envelope.event.type === event.type ||
        envelope.event.type === 'runner.event-refused',
    ),
  }
}
