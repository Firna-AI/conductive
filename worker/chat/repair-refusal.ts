import type { RunnerReportKind } from '../../src/shared/runner'
import type { RunnerFileEvent } from '../../src/shared/files'
import {
  fullReportRevision,
  isMultipartTail,
  storedReportGenerations,
} from '../files/report-generation'
import { isRecord } from '../http'
import type { IncomingRunnerEnvelope } from './runner-input'
import type { ChatTransaction } from './store'

function reportKind(value: unknown): RunnerReportKind | null {
  if (!isRecord(value)) return null
  switch (value.type) {
    case 'files.changed':
      return 'files.snapshot'
    case 'files.snapshot':
    case 'changes.updated':
    case 'start.updated':
    case 'workspace.title':
      return value.type
    default:
      return null
  }
}

export async function refuseReportRepair(
  transaction: ChatTransaction,
  message: IncomingRunnerEnvelope,
  randomId: () => string,
): Promise<boolean> {
  const kind = reportKind(message.event)
  if (!kind) return false
  const repair = await transaction.repairs.get(kind)
  const fileKind = kind === 'files.snapshot' || kind === 'changes.updated'
  const revision = fileKind ? fullReportRevision(message.event, kind) : null
  if (!repair) {
    const generations = fileKind
      ? await storedReportGenerations(transaction.files, kind)
      : null
    await transaction.repairs.save({
      command: { type: 'report.refresh', commandId: randomId(), kind },
      cause: {
        streamId: message.streamId,
        eventNumber: message.eventNumber,
        revision: generations
          ? Math.max(generations.latest, revision ?? 0)
          : null,
      },
      state: 'pending',
      sent: false,
      replacementRevision: null,
    })
    return false
  }
  if (fileKind) {
    if (!isRecord(message.event) || message.event.type !== kind) return false
    const currentReplacement = repair.replacementRevision === revision
    const oldTail =
      revision !== null &&
      isMultipartTail(message.event, kind) &&
      message.streamId === repair.cause.streamId &&
      revision <= (repair.cause.revision ?? 0) &&
      !currentReplacement
    if (oldTail) return false
  }
  repair.state = 'failed'
  await transaction.repairs.save(repair)
  return true
}

/** Accepted part one starts a replacement, even at a refused unapplied revision. */
export async function observeRepairPart(
  transaction: ChatTransaction,
  streamId: string,
  event: RunnerFileEvent,
): Promise<void> {
  if (event.type === 'files.changed') return
  const part = event.type === 'files.snapshot' ? event.tree : event.changes
  if (part.partNumber !== 1 || part.partCount === 1) return
  const repair = await transaction.repairs.get(event.type)
  if (!repair || repair.cause.streamId !== streamId) return
  const generations = await storedReportGenerations(
    transaction.files,
    event.type,
  )
  if (
    generations.pending !== part.revision ||
    repair.replacementRevision === part.revision
  )
    return
  repair.replacementRevision = part.revision
  await transaction.repairs.save(repair)
}
