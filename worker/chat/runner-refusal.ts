import type {
  RunnerEventRefused,
  RunnerEventRefusalReason,
} from '../../src/shared/chat-events'
import { isRecord } from '../http'
import { RunnerFileReports } from '../files/runner-reports'
import type { IncomingRunnerEnvelope } from './runner-input'
import type { ChatTransaction } from './store'
import { refuseReportRepair } from './repair-refusal'
import { TurnLifecycle } from './turn-lifecycle'

export function runnerEventType(
  value: unknown,
): RunnerEventRefused['runnerEventType'] {
  if (!isRecord(value)) return 'unknown'
  switch (value.type) {
    case 'turn.started':
    case 'turn.thinking':
    case 'assistant.delta':
    case 'assistant.completed':
    case 'tool.updated':
    case 'turn.completed':
    case 'turn.failed':
    case 'runner.ready':
    case 'start.updated':
    case 'workspace.title':
    case 'files.snapshot':
    case 'files.changed':
    case 'changes.updated':
      return value.type
    default:
      return 'unknown'
  }
}

export async function verifiedTurn(
  transaction: ChatTransaction,
  value: unknown,
) {
  if (
    !isRecord(value) ||
    typeof value.sessionId !== 'string' ||
    typeof value.turnId !== 'string'
  )
    return null
  const session = (await transaction.sessions()).find(
    (session) => session.id === value.sessionId,
  )
  if (!session) return null
  const turn = (await transaction.turns()).find(
    (turn) => turn.id === value.turnId,
  )
  if (!session || !turn || turn.sessionId !== session.id) return null
  return { session, turn, active: session.activeTurnId === turn.id }
}

export async function refuseRunnerEvent(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  reason: RunnerEventRefusalReason,
  randomId: () => string,
): Promise<void> {
  const type = runnerEventType(message.event)
  const workspaceLevel =
    type === 'runner.ready' ||
    type === 'start.updated' ||
    type === 'workspace.title' ||
    type === 'files.snapshot' ||
    type === 'files.changed' ||
    type === 'changes.updated'
  const target = workspaceLevel
    ? null
    : await verifiedTurn(transaction, message.event)
  const marker: RunnerEventRefused = {
    type: 'runner.event-refused',
    streamId: message.streamId,
    runnerEventNumber: message.eventNumber,
    runnerEventType: type,
    reason,
    sessionId: target?.session.id ?? null,
    turnId: target?.turn.id ?? null,
    ...((await refuseReportRepair(transaction, message, randomId))
      ? { repairFailed: true as const }
      : {}),
  }
  const occurredAt =
    typeof message.occurredAt === 'number' &&
    Number.isFinite(message.occurredAt) &&
    message.occurredAt >= 0
      ? message.occurredAt
      : transaction.now
  await new RunnerFileReports(transaction.files).refuse(type)
  await transaction.emit(marker, occurredAt)
  if (target?.active && (type === 'turn.completed' || type === 'turn.failed')) {
    await new TurnLifecycle(transaction, target.session).finish(target.turn, {
      state: 'failed',
    })
  }
}
