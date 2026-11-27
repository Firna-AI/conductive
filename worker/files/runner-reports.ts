import type { RunnerFileEvent } from '../../src/shared/generated/RunnerFileEvent'
import type { BrowserChangesResponse } from '../../src/shared/generated/BrowserChangesResponse'
import type { FileEvent } from '../../src/shared/files'
import { applyChangesDelta } from './bucket-changes-delta'
import { invalidRunnerReport as invalid } from './errors'
import {
  emptySequence,
  loadReportState,
  reportPartFields,
  reportPartUpdates,
  REPORT_KEY,
  storedPart,
  storedParts,
  storedReportKeys,
  type FullReportPart,
  type ReportKind,
  type ReportState,
} from './report-storage'
import { applyFilesEvent, beginFilesConnection } from './state'
import type { FilesReader, FilesStorage, FilesTransaction } from './storage'

function checkPaths(entries: readonly { path: string }[], partCount: number) {
  if (entries.length === 0 && partCount !== 1) invalid()
  const paths = new Set<string>()
  for (const { path } of entries) {
    if (paths.has(path)) invalid()
    paths.add(path)
  }
}

function joinReport(parts: readonly RunnerFileEvent[]): FileEvent {
  const first = parts[0]
  if (first?.type === 'files.snapshot') {
    const { omittedEntryCount } = first.tree
    const entries = parts.flatMap((part) => {
      if (
        part.type !== 'files.snapshot' ||
        part.tree.omittedEntryCount !== omittedEntryCount
      )
        return invalid()
      return part.tree.entries
    })
    checkPaths(entries, first.tree.partCount)
    return {
      type: first.type,
      tree: {
        revision: first.tree.revision,
        entries,
        ...(omittedEntryCount === undefined ? {} : { omittedEntryCount }),
      },
    }
  }
  if (first?.type !== 'changes.updated') return invalid()
  const { omitted } = first.changes
  const files = parts.flatMap((part) => {
    if (part.type !== 'changes.updated') return invalid()
    const other = part.changes.omitted
    if (
      other?.files !== omitted?.files ||
      other?.added !== omitted?.added ||
      other?.removed !== omitted?.removed
    )
      return invalid()
    return part.changes.files
  })
  checkPaths(files, first.changes.partCount)
  const summary = { files: files.length, added: 0, removed: 0 }
  for (const file of files) {
    summary.added += file.added
    summary.removed += file.removed
  }
  const reported = first.changes.summary
  if (
    reported.files !== summary.files ||
    reported.added !== summary.added ||
    reported.removed !== summary.removed
  )
    invalid()
  const changes: BrowserChangesResponse = {
    revision: first.changes.revision,
    baseBranch: first.changes.baseBranch,
    ...(first.changes.unpushedCommits === undefined
      ? {}
      : { unpushedCommits: first.changes.unpushedCommits }),
    ...(first.changes.uncommittedFileCount === undefined
      ? {}
      : { uncommittedFileCount: first.changes.uncommittedFileCount }),
    ...(first.changes.displayBaseBranch === undefined
      ? {}
      : { displayBaseBranch: first.changes.displayBaseBranch }),
    summary,
    ...(omitted === undefined ? {} : { omitted }),
    files,
  }
  return { type: first.type, changes }
}

async function applyReport(
  transaction: FilesTransaction,
  streamId: string,
  event: FileEvent,
): Promise<void> {
  if (!(await applyFilesEvent(transaction, streamId, event)))
    throw new Error('The complete runner report could not be stored.')
}

async function requireReportState(storage: FilesReader): Promise<ReportState> {
  const state = await loadReportState(storage)
  if (!state) throw new Error('Start the runner stream before its reports.')
  return state
}

/** All writes use the owner's receipt transaction, including the last projection. */
export class RunnerFileReports {
  private readonly storage: FilesStorage

  constructor(storage: FilesStorage) {
    this.storage = storage
  }

  beginStream(streamId: string): Promise<void> {
    return this.storage.transaction(async (transaction) => {
      const previous = await loadReportState(transaction)
      if (previous?.streamId === streamId) return
      const state: ReportState = {
        streamId,
        tree: emptySequence(),
        changes: emptySequence(),
      }
      await beginFilesConnection(transaction, streamId)
      await transaction.put(REPORT_KEY, state)
      if (previous) {
        for (const kind of ['tree', 'changes'] as const) {
          for (const key of await storedReportKeys(
            transaction,
            kind,
            previous[kind].report,
          ))
            await transaction.delete(key)
        }
      }
    })
  }

  async refuse(type: string): Promise<void> {
    const kind =
      type === 'changes.updated' || type === 'changes.changed'
        ? 'changes'
        : type === 'files.snapshot' || type === 'files.changed'
          ? 'tree'
          : null
    if (!kind) return
    await this.storage.transaction(async (transaction) => {
      const state = await requireReportState(transaction)
      const sequence = state[kind]
      const report = sequence.report
      const removals =
        report && report.through < report.partCount
          ? await storedReportKeys(transaction, kind, report)
          : []
      if (removals.length) sequence.report = null
      sequence.seen = true
      await transaction.put(REPORT_KEY, state)
      for (const key of removals) await transaction.delete(key)
    })
  }

  accept(event: RunnerFileEvent): Promise<FileEvent | null> {
    return this.storage.transaction(async (transaction) => {
      const state = await requireReportState(transaction)
      if (event.type === 'files.snapshot' || event.type === 'changes.updated')
        return this.acceptPart(transaction, state, event)

      if (event.type === 'files.changed' || event.type === 'changes.changed') {
        const sequence =
          event.type === 'files.changed' ? state.tree : state.changes
        if (
          !sequence.appliedRevision ||
          event.delta.revision !== sequence.appliedRevision + 1 ||
          (sequence.report &&
            sequence.report.through < sequence.report.partCount)
        )
          invalid()
        sequence.appliedRevision = event.delta.revision
      }
      if (event.type === 'changes.changed')
        await applyChangesDelta(transaction, state.streamId, event.delta)
      else await applyReport(transaction, state.streamId, event)
      await transaction.put(REPORT_KEY, state)
      return event
    })
  }

  private async acceptPart(
    transaction: FilesTransaction,
    state: ReportState,
    event: FullReportPart,
  ): Promise<FileEvent | null> {
    const kind: ReportKind =
      event.type === 'files.snapshot' ? 'tree' : 'changes'
    const sequence = state[kind]
    const part = event.type === 'files.snapshot' ? event.tree : event.changes
    const previous = sequence.report
    const sameRevision = previous?.revision === part.revision
    if (sameRevision && previous) {
      if (previous.partCount !== part.partCount) invalid()
      if (part.partNumber <= previous.through) {
        const stored = await storedPart(transaction, kind, part.partNumber)
        if (JSON.stringify(stored) !== JSON.stringify(event)) invalid()
        return null
      }
      if (part.partNumber !== previous.through + 1) invalid()
    } else if (
      part.partNumber !== 1 ||
      part.revision <= sequence.appliedRevision ||
      (!sequence.seen && part.revision !== 1) ||
      (previous && part.revision <= previous.revision)
    )
      invalid()
    const fields = reportPartFields(event)
    let firstPart: RunnerFileEvent | undefined
    if (sameRevision && previous) {
      let expected = previous.fields
      if (!expected) {
        firstPart = await storedPart(transaction, kind, 1)
        if (firstPart.type !== event.type) return invalid()
        expected = reportPartFields(firstPart)
      }
      if (JSON.stringify(fields) !== JSON.stringify(expected)) invalid()
    }
    let complete: FileEvent | null = null
    if (part.partNumber === part.partCount) {
      // A previous Worker can leave stored parts with different omission fields.
      const parts =
        sameRevision && previous
          ? await storedParts(transaction, kind, previous, firstPart)
          : []
      parts.push(event)
      complete = joinReport(parts)
    }
    sequence.seen = true
    sequence.report = {
      revision: part.revision,
      partCount: part.partCount,
      through: part.partNumber,
      fields,
    }
    if (complete) sequence.appliedRevision = part.revision
    const updates = {
      ...reportPartUpdates(kind, part.partNumber, event),
      [REPORT_KEY]: state,
    }
    const removals = sameRevision
      ? []
      : (await storedReportKeys(transaction, kind, previous)).filter(
          (key) => !(key in updates),
        )
    for (const [key, value] of Object.entries(updates))
      await transaction.put(key, value)
    for (const key of removals) await transaction.delete(key)
    if (complete) await applyReport(transaction, state.streamId, complete)
    return complete
  }
}
