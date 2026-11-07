import type { FileReportKind, StreamEnvelope } from '../api/parse-events'

/**
 * The file lists whose repair failed, each with the time of its first
 * failure since the last full report of its kind.
 */
export type FailedRepairs = Readonly<Partial<Record<FileReportKind, number>>>

export const noFailedRepairs: FailedRepairs = {}

/**
 * The failed repairs after one event of the stream, in event order. A
 * failed repair stays until a later full report of the same list: a full
 * tree for All files, a full list of changes for Changes. A tree update, a
 * report of the other list, and a read of a route clear nothing. A further
 * failure of a failed list keeps the time of the first one.
 */
export function repairsAfter(
  repairs: FailedRepairs,
  envelope: StreamEnvelope,
): FailedRepairs {
  const failed = envelope.failedRepair
  if (failed) {
    if (repairs[failed.report] !== undefined) return repairs
    return { ...repairs, [failed.report]: failed.at }
  }
  const report = envelope.event?.type
  if (report !== 'files.snapshot' && report !== 'changes.updated') {
    return repairs
  }
  if (repairs[report] === undefined) return repairs
  const cleared = { ...repairs }
  delete cleared[report]
  return cleared
}
