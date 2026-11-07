import { isRecord } from '../http'
import { loadReportState } from './report-storage'
import type { FilesStorage } from './storage'

type FullFileReportKind = 'files.snapshot' | 'changes.updated'

export function isMultipartTail(
  value: unknown,
  kind: FullFileReportKind,
): boolean {
  if (!isRecord(value) || value.type !== kind) return false
  const report = kind === 'files.snapshot' ? value.tree : value.changes
  return (
    isRecord(report) &&
    typeof report.partNumber === 'number' &&
    Number.isSafeInteger(report.partNumber) &&
    report.partNumber > 1 &&
    typeof report.partCount === 'number' &&
    Number.isSafeInteger(report.partCount) &&
    report.partCount >= report.partNumber
  )
}

export function fullReportRevision(
  value: unknown,
  kind: FullFileReportKind,
): number | null {
  if (!isRecord(value) || value.type !== kind) return null
  const report = kind === 'files.snapshot' ? value.tree : value.changes
  if (
    !isRecord(report) ||
    typeof report.revision !== 'number' ||
    !Number.isSafeInteger(report.revision) ||
    report.revision <= 0
  )
    return null
  return report.revision
}

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
