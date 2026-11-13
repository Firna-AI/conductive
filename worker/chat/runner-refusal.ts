import type {
  RunnerEventRefused,
  RunnerEventRefusalReason,
} from '../../src/shared/chat-events'
import { RunnerFileReports } from '../files/runner-reports'
import { readRunnerEventIdentity } from './runner-event-identity'
import type { IncomingRunnerEnvelope } from './runner-input'
import type { ChatTransaction } from './store'
import { refuseReportRepair } from './repair-refusal'
import { verifiedTurn } from './turn-context'
import { TurnLifecycle } from './turn-lifecycle'

export async function refuseRunnerEvent(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  reason: RunnerEventRefusalReason,
  randomId: () => string,
): Promise<void> {
  const identity = readRunnerEventIdentity(message.event)
  const type = identity.type ?? 'unknown'
  const workspaceLevel =
    type === 'runner.ready' ||
    type === 'start.updated' ||
    type === 'workspace.title' ||
    type === 'skills.updated' ||
    type === 'files.snapshot' ||
    type === 'files.changed' ||
    type === 'changes.updated'
  const target = workspaceLevel
    ? null
    : await verifiedTurn(transaction, identity)
  const repairFailed = await refuseReportRepair(
    transaction,
    message,
    identity,
    randomId,
  )
  const marker: RunnerEventRefused = {
    type: 'runner.event-refused',
    streamId: message.streamId,
    runnerEventNumber: message.eventNumber,
    runnerEventType: type,
    reason,
    sessionId: target?.session.id ?? null,
    turnId: target?.turn.id ?? null,
    ...(repairFailed ? { repairFailed: true as const } : {}),
  }
  const occurredAt =
    typeof message.occurredAt === 'number' &&
    Number.isFinite(message.occurredAt) &&
    message.occurredAt >= 0
      ? message.occurredAt
      : transaction.now
  await new RunnerFileReports(transaction.files).refuse(type)
  await transaction.emit(marker, occurredAt)
  if (type === 'skills.updated')
    await transaction.skills.refused(message.streamId, repairFailed, occurredAt)
  if (
    target?.active &&
    !target.ended &&
    target.started === true &&
    (type === 'turn.completed' || type === 'turn.failed')
  ) {
    await new TurnLifecycle(transaction, target.session).runnerEnded(
      target.turn,
      null,
      occurredAt,
      randomId,
    )
  }
}
