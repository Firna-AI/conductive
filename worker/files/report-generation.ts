import { loadReportState } from './report-storage'
import type { FilesStorage } from './storage'

type FullFileReportKind = 'files.snapshot' | 'changes.updated'

export async function storedReportGenerations(
  storage: FilesStorage,
  kind: FullFileReportKind,
) {
  const state = await loadReportState(storage)
  const sequence = kind === 'files.snapshot' ? state?.tree : state?.changes
  return {
    latest: Math.max(
      sequence?.appliedRevision ?? 0,
      sequence?.report?.revision ?? 0,
    ),
    pending:
      sequence?.report && sequence.report.through < sequence.report.partCount
        ? sequence.report.revision
        : null,
  }
}
