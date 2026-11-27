import type { BranchChangedFile } from '../../src/shared/generated/BranchChangedFile'
import type { BrowserChangesResponse } from '../../src/shared/generated/BrowserChangesResponse'
import type { ChangeKind } from '../../src/shared/generated/ChangeKind'
import type { ChangesDelta } from '../../src/shared/generated/ChangesDelta'
import type { ChangesDeltaUpsert } from '../../src/shared/generated/ChangesDeltaUpsert'
import type { ChangesResponseSummary } from '../../src/shared/generated/ChangesResponseSummary'
import type { FileEntry } from '../../src/shared/generated/FileEntry'
import type { FileTreeChange } from '../../src/shared/generated/FileTreeChange'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import { isFilePath } from '../../src/shared/file-path'
import type { FileEvent } from '../../src/shared/files'
import { isRecord } from '../http'
import { invalidFileResponse } from './errors'

export function natural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function changeKind(value: unknown): value is ChangeKind {
  return (
    value === 'added' ||
    value === 'modified' ||
    value === 'deleted' ||
    value === 'renamed' ||
    value === 'untracked'
  )
}

function fileEntry(value: unknown): FileEntry {
  if (
    !isRecord(value) ||
    !isFilePath(value.path) ||
    typeof value.name !== 'string' ||
    (value.kind !== 'file' && value.kind !== 'directory') ||
    (value.change !== null && !changeKind(value.change))
  )
    throw invalidFileResponse()
  return {
    path: value.path,
    ...(typeof value.displayPath === 'string'
      ? { displayPath: value.displayPath }
      : {}),
    name: value.name,
    kind: value.kind,
    change: value.change,
  }
}

export function parseTree(value: unknown): FileTreeResponse {
  if (
    !isRecord(value) ||
    !natural(value.revision) ||
    (value.omittedEntryCount !== undefined &&
      !natural(value.omittedEntryCount)) ||
    !Array.isArray(value.entries)
  ) {
    throw invalidFileResponse()
  }
  return {
    revision: value.revision,
    entries: value.entries.map(fileEntry),
    ...(value.unavailable === true ? { unavailable: true } : {}),
    ...(value.omittedEntryCount === undefined
      ? {}
      : { omittedEntryCount: value.omittedEntryCount }),
  }
}

function treeChange(value: unknown): FileTreeChange {
  if (!isRecord(value)) throw invalidFileResponse()
  if (value.operation === 'upsert') {
    return { operation: 'upsert', entry: fileEntry(value.entry) }
  }
  if (value.operation === 'remove' && isFilePath(value.path)) {
    return { operation: 'remove', path: value.path }
  }
  if (value.operation === 'move' && isFilePath(value.previousPath)) {
    return {
      operation: 'move',
      previousPath: value.previousPath,
      entry: fileEntry(value.entry),
    }
  }
  throw invalidFileResponse()
}

export function parseChangedFile(value: unknown): BranchChangedFile {
  if (
    !isRecord(value) ||
    !isFilePath(value.path) ||
    !changeKind(value.change) ||
    !natural(value.added) ||
    !natural(value.removed) ||
    typeof value.uncommitted !== 'boolean' ||
    (value.previousPath !== undefined && !isFilePath(value.previousPath))
  )
    throw invalidFileResponse()
  return {
    path: value.path,
    ...(typeof value.displayPath === 'string'
      ? { displayPath: value.displayPath }
      : {}),
    change: value.change,
    added: value.added,
    removed: value.removed,
    uncommitted: value.uncommitted,
    ...(typeof value.previousDisplayPath === 'string'
      ? { previousDisplayPath: value.previousDisplayPath }
      : {}),
    ...(value.previousPath === undefined
      ? {}
      : { previousPath: value.previousPath }),
  }
}

export function parseChangesSummary(
  value: unknown,
): ChangesResponseSummary | undefined {
  if (
    !isRecord(value) ||
    !natural(value.files) ||
    !natural(value.added) ||
    !natural(value.removed)
  )
    return undefined
  return { files: value.files, added: value.added, removed: value.removed }
}

function changesHeader(
  value: Record<string, unknown>,
): Omit<BrowserChangesResponse, 'revision' | 'files'> {
  if (
    typeof value.baseBranch !== 'string' ||
    (value.unpushedCommits !== undefined && !natural(value.unpushedCommits)) ||
    (value.uncommittedFileCount !== undefined &&
      !natural(value.uncommittedFileCount))
  )
    throw invalidFileResponse()
  const summary = parseChangesSummary(value.summary)
  const omitted = parseChangesSummary(value.omitted)
  if (!summary || (value.omitted !== undefined && !omitted))
    throw invalidFileResponse()
  return {
    baseBranch: value.baseBranch,
    ...(value.unpushedCommits === undefined
      ? {}
      : { unpushedCommits: value.unpushedCommits }),
    ...(value.uncommittedFileCount === undefined
      ? {}
      : { uncommittedFileCount: value.uncommittedFileCount }),
    ...(typeof value.displayBaseBranch === 'string'
      ? { displayBaseBranch: value.displayBaseBranch }
      : {}),
    summary,
    ...(omitted === undefined ? {} : { omitted }),
  }
}

export function parseChanges(value: unknown): BrowserChangesResponse {
  if (
    !isRecord(value) ||
    (value.revision !== undefined && !natural(value.revision)) ||
    !Array.isArray(value.files)
  )
    throw invalidFileResponse()
  return {
    ...changesHeader(value),
    ...(value.revision === undefined ? {} : { revision: value.revision }),
    files: value.files.map(parseChangedFile),
  }
}

function removePath(value: unknown): string {
  if (!isFilePath(value)) throw invalidFileResponse()
  return value
}

function changesUpsert(value: unknown): ChangesDeltaUpsert {
  if (!isRecord(value) || !natural(value.index)) throw invalidFileResponse()
  return { index: value.index, file: parseChangedFile(value.file) }
}

function parseChangesDelta(value: unknown): ChangesDelta {
  if (
    !isRecord(value) ||
    !natural(value.revision) ||
    !Array.isArray(value.removes) ||
    !Array.isArray(value.upserts)
  )
    throw invalidFileResponse()
  const header = changesHeader(value)
  if (!header.omitted) throw invalidFileResponse()
  return {
    ...header,
    revision: value.revision,
    omitted: header.omitted,
    removes: value.removes.map(removePath),
    upserts: value.upserts.map(changesUpsert),
  }
}

export function parseFileEvent(value: unknown): FileEvent {
  if (!isRecord(value)) throw invalidFileResponse()
  if (value.type === 'files.unavailable') return { type: value.type }
  if (value.type === 'files.snapshot')
    return { type: value.type, tree: parseTree(value.tree) }
  if (value.type === 'changes.updated')
    return { type: value.type, changes: parseChanges(value.changes) }
  if (value.type === 'changes.changed')
    return { type: value.type, delta: parseChangesDelta(value.delta) }
  if (
    value.type === 'files.changed' &&
    isRecord(value.delta) &&
    natural(value.delta.revision) &&
    (value.delta.omittedEntryCount === undefined ||
      natural(value.delta.omittedEntryCount)) &&
    Array.isArray(value.delta.changes)
  ) {
    return {
      type: value.type,
      delta: {
        revision: value.delta.revision,
        changes: value.delta.changes.map(treeChange),
        ...(value.delta.omittedEntryCount === undefined
          ? {}
          : { omittedEntryCount: value.delta.omittedEntryCount }),
      },
    }
  }
  throw invalidFileResponse()
}
