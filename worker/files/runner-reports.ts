import type { RunnerFileEvent } from '../../src/shared/generated/RunnerFileEvent'
import type { FileEvent } from '../../src/shared/files'
import {
  changesPartFields,
  emptySequence,
  loadReportState,
  reportPartUpdates,
  REPORT_KEY,
  storedPart,
  storedParts,
  storedReportKeys,
  type ChangesPartFields,
  type ReportKind,
  type ReportState,
} from './report-storage'
import { FilesState } from './state'
import type { FilesStorage } from './storage'

export class InvalidRunnerReport extends Error {}
const invalid = (): never => {
  throw new InvalidRunnerReport('The runner report is invalid.')
}

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
    const entries = parts.flatMap((part) =>
      part.type === 'files.snapshot' ? part.tree.entries : invalid(),
    )
    checkPaths(entries, first.tree.partCount)
    return {
      type: first.type,
      tree: { revision: first.tree.revision, entries },
    }
  }
  if (first?.type !== 'changes.updated') return invalid()
  const files = parts.flatMap((part) =>
    part.type === 'changes.updated' ? part.changes.files : invalid(),
  )
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
  return {
    type: first.type,
    changes: {
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
      files,
    },
  }
}

/** All writes use the owner's receipt transaction, including the last projection. */
export class RunnerFileReports {
  private readonly storage: FilesStorage

  constructor(storage: FilesStorage) {
    this.storage = storage
  }

  async beginStream(streamId: string): Promise<void> {
    const previous = await loadReportState(this.storage)
    if (previous?.streamId === streamId) return
    const state: ReportState = {
      streamId,
      tree: emptySequence(),
      changes: emptySequence(),
    }
    await new FilesState(this.storage).beginConnection(streamId)
    await this.storage.write(
      { [REPORT_KEY]: state },
      previous
        ? [
            ...(await storedReportKeys(
              this.storage,
              'tree',
              previous.tree.report,
            )),
            ...(await storedReportKeys(
              this.storage,
              'changes',
              previous.changes.report,
            )),
          ]
        : [],
    )
  }

  async refuse(type: string): Promise<void> {
    const kind =
      type === 'changes.updated'
        ? 'changes'
        : type === 'files.snapshot' || type === 'files.changed'
          ? 'tree'
          : null
    if (!kind) return
    const state = await this.state()
    const sequence = state[kind]
    const report = sequence.report
    const removals =
      report && report.through < report.partCount
        ? await storedReportKeys(this.storage, kind, report)
        : []
    if (removals.length) sequence.report = null
    sequence.seen = true
    await this.storage.write({ [REPORT_KEY]: state }, removals)
  }

  async accept(event: RunnerFileEvent): Promise<FileEvent | null> {
    const state = await this.state()
    if (event.type === 'files.unavailable') {
      await this.apply(state, event)
      return event
    }
    if (event.type === 'files.changed') {
      const sequence = state.tree
      if (
        !sequence.appliedRevision ||
        event.delta.revision !== sequence.appliedRevision + 1 ||
        (sequence.report && sequence.report.through < sequence.report.partCount)
      )
        invalid()
      sequence.appliedRevision = event.delta.revision
      await this.apply(state, event)
      return event
    }
    const kind: ReportKind =
      event.type === 'files.snapshot' ? 'tree' : 'changes'
    const sequence = state[kind]
    const part = event.type === 'files.snapshot' ? event.tree : event.changes
    const previous = sequence.report
    const sameRevision = previous?.revision === part.revision
    if (sameRevision && previous) {
      if (previous.partCount !== part.partCount) invalid()
      if (part.partNumber <= previous.through) {
        const stored = await storedPart(this.storage, kind, part.partNumber)
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
    let fields: ChangesPartFields | undefined
    let firstPart: RunnerFileEvent | undefined
    if (event.type === 'changes.updated') {
      const incoming = changesPartFields(event.changes)
      if (sameRevision && previous) {
        fields = previous.fields
        if (!fields) {
          firstPart = await storedPart(this.storage, 'changes', 1)
          if (firstPart.type !== 'changes.updated') return invalid()
          fields = changesPartFields(firstPart.changes)
        }
        if (JSON.stringify(incoming) !== JSON.stringify(fields)) invalid()
      } else {
        fields = incoming
      }
    }
    let complete: FileEvent | null = null
    if (part.partNumber === part.partCount) {
      const parts =
        sameRevision && previous
          ? await storedParts(this.storage, kind, previous, firstPart)
          : []
      parts.push(event)
      complete = joinReport(parts)
    }
    sequence.seen = true
    sequence.report = {
      revision: part.revision,
      partCount: part.partCount,
      through: part.partNumber,
      ...(fields ? { fields } : {}),
    }
    if (complete) sequence.appliedRevision = part.revision
    const updates = {
      ...reportPartUpdates(kind, part.partNumber, event),
      [REPORT_KEY]: state,
    }
    const removals = sameRevision
      ? []
      : (await storedReportKeys(this.storage, kind, previous)).filter(
          (key) => !(key in updates),
        )
    await this.storage.write(updates, removals)
    if (complete) await this.apply(state, complete)
    return complete
  }

  private async state(): Promise<ReportState> {
    const state = await loadReportState(this.storage)
    if (!state) throw new Error('Start the runner stream before its reports.')
    return state
  }

  private async apply(state: ReportState, event: FileEvent): Promise<void> {
    const accepted = await new FilesState(this.storage).apply(
      state.streamId,
      event,
    )
    if (!accepted)
      throw new Error('The complete runner report could not be stored.')
    await this.storage.write({ [REPORT_KEY]: state }, [])
  }
}
