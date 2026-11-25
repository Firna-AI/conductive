import type { RunnerChangesPart } from '../../src/shared/generated/RunnerChangesPart'
import { chatFilesStorage } from '../chat/files-storage'
import { nativeChatStore } from '../chat/native-store.test-support'
import {
  emptySequence,
  reportPartUpdates,
  REPORT_KEY,
  type FullReportPart,
  type ReportKind,
} from './report-storage'
import { RunnerFileReports } from './runner-reports'
import type { FilesStorage } from './storage'
import { observeFilesStorage } from './test-support/observe-storage'
import { writeStorageRecord } from './test-support/storage-record'

export function changesPart(
  partNumber: number,
  partCount: number,
  patch: Partial<RunnerChangesPart> = {},
) {
  const changes: RunnerChangesPart = {
    revision: 1,
    partNumber,
    partCount,
    baseBranch: 'main',
    unpushedCommits: 3,
    files: [
      {
        path: `file-${partNumber}`,
        change: 'modified',
        added: 1,
        removed: 0,
        uncommitted: true,
      },
    ],
    summary: { files: partCount, added: partCount, removed: 0 },
    ...patch,
  }
  return { type: 'changes.updated' as const, changes }
}

export async function trackedReports() {
  const storage = chatFilesStorage((await nativeChatStore()).storage)
  const observed = observeFilesStorage(storage)
  const reports = new RunnerFileReports(observed.storage)
  await reports.beginStream('stream')
  return { storage, reports, reads: observed.reads }
}

export async function seedReportParts(
  storage: FilesStorage,
  kind: ReportKind,
  parts: readonly [FullReportPart, ...FullReportPart[]],
  fields?: unknown,
): Promise<string[]> {
  const first = parts[0]
  const { revision, partCount } =
    first.type === 'files.snapshot' ? first.tree : first.changes
  const updates = parts.flatMap((part, index) =>
    Object.entries(reportPartUpdates(kind, index + 1, part)),
  )
  await writeStorageRecord(storage, {
    [REPORT_KEY]: {
      streamId: 'stream',
      tree: emptySequence(),
      changes: emptySequence(),
      [kind]: {
        appliedRevision: 0,
        seen: true,
        report: {
          revision,
          partCount,
          through: parts.length,
          ...(fields === undefined ? {} : { fields }),
        },
      },
    },
    ...Object.fromEntries(updates),
  })
  return updates.map(([key]) => key)
}
