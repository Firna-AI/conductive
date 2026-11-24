import type { FileReportKind, StreamEnvelope } from '../api/parse-events'

/**
 * The file lists whose repair failed, each with the time of its first
 * failure since the last full report of its kind.
 */
export type FailedRepairs = Readonly<Partial<Record<FileReportKind, number>>>

export const noFailedRepairs: FailedRepairs = {}

export function setFailedRepair(
  repairs: FailedRepairs,
  report: FileReportKind,
  at: number | undefined,
): FailedRepairs {
  if (repairs[report] === at) return repairs
  if (at !== undefined) return { ...repairs, [report]: at }
  const cleared = { ...repairs }
  delete cleared[report]
  return cleared
}

/**
 * The failed repairs after one event of the stream, in event order. A
 * failed repair stays until a later full report of the same list: a full
 * tree for All files, a full list of changes for Changes. A further failure
 * of a failed list keeps the time of the first one.
 */
export function repairsAfter(
  repairs: FailedRepairs,
  envelope: StreamEnvelope,
): FailedRepairs {
  const failed = envelope.failedRepair
  if (failed) {
    return setFailedRepair(
      repairs,
      failed.report,
      repairs[failed.report] ?? failed.at,
    )
  }
  const report = envelope.event?.type
  if (report !== 'files.snapshot' && report !== 'changes.updated') {
    return repairs
  }
  return setFailedRepair(repairs, report, undefined)
}
