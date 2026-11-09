import { isFilePath } from '../../src/shared/file-path'
import type {
  BranchChangedFile,
  ChangeKind,
  ChangesResponse,
  FileEntry,
  FileEvent,
  FileTreeChange,
  FileTreeResponse,
} from '../../src/shared/files'
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
    !Array.isArray(value.entries)
  ) {
    throw invalidFileResponse()
  }
  return {
    revision: value.revision,
    entries: value.entries.map(fileEntry),
    ...(value.unavailable === true ? { unavailable: true } : {}),
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

function changedFile(value: unknown): BranchChangedFile {
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

export function parseChanges(value: unknown): ChangesResponse {
  if (
    !isRecord(value) ||
    typeof value.baseBranch !== 'string' ||
    (value.unpushedCommits !== undefined && !natural(value.unpushedCommits)) ||
    !Array.isArray(value.files) ||
    !isRecord(value.summary) ||
    !natural(value.summary.files) ||
    !natural(value.summary.added) ||
    !natural(value.summary.removed)
  )
    throw invalidFileResponse()
  return {
    baseBranch: value.baseBranch,
    ...(value.unpushedCommits === undefined
      ? {}
      : { unpushedCommits: value.unpushedCommits }),
    ...(typeof value.displayBaseBranch === 'string'
      ? { displayBaseBranch: value.displayBaseBranch }
      : {}),
    files: value.files.map(changedFile),
    summary: {
      files: value.summary.files,
      added: value.summary.added,
      removed: value.summary.removed,
    },
  }
}

export function parseFileEvent(value: unknown): FileEvent {
  if (!isRecord(value)) throw invalidFileResponse()
  if (value.type === 'files.unavailable') return { type: value.type }
  if (value.type === 'files.snapshot')
    return { type: value.type, tree: parseTree(value.tree) }
  if (value.type === 'changes.updated')
    return { type: value.type, changes: parseChanges(value.changes) }
  if (
    value.type === 'files.changed' &&
    isRecord(value.delta) &&
    natural(value.delta.revision) &&
    Array.isArray(value.delta.changes)
  ) {
    return {
      type: value.type,
      delta: {
        revision: value.delta.revision,
        changes: value.delta.changes.map(treeChange),
      },
    }
  }
  throw invalidFileResponse()
}
