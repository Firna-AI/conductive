import type {
  FileEntry,
  FileTreeChange,
  FileTreeDelta,
  FileTreeResponse,
} from '../../shared/files'
import {
  isObject,
  parseItems,
  readArray,
  readCount,
  readString,
} from './guards'
import { parseChangeKind } from './parse-changes'

export function parseFileEntry(value: unknown): FileEntry | null {
  if (!isObject(value)) return null
  const path = readString(value, 'path')
  const name = readString(value, 'name')
  const kind = value.kind
  if (!path || name === null) return null
  if (kind !== 'file' && kind !== 'directory') return null
  return { path, name, kind, change: parseChangeKind(value.change) }
}

/** A full tree. Entries that do not parse are left out. */
export function parseFileTree(value: unknown): FileTreeResponse | null {
  if (!isObject(value)) return null
  const revision = readCount(value, 'revision')
  const entries = readArray(value, 'entries')
  if (revision === null || entries === null) return null
  return { revision, entries: parseItems(entries, parseFileEntry) }
}

function parseTreeChange(value: unknown): FileTreeChange | null {
  if (!isObject(value)) return null
  if (value.operation === 'remove') {
    const path = readString(value, 'path')
    return path ? { operation: 'remove', path } : null
  }
  const entry = parseFileEntry(value.entry)
  if (!entry) return null
  if (value.operation === 'upsert') return { operation: 'upsert', entry }
  const previousPath = readString(value, 'previousPath')
  if (value.operation === 'move' && previousPath) {
    return { operation: 'move', previousPath, entry }
  }
  return null
}

export function parseTreeDelta(value: unknown): FileTreeDelta | null {
  if (!isObject(value)) return null
  const revision = readCount(value, 'revision')
  const changes = readArray(value, 'changes')
  if (revision === null || changes === null) return null
  return { revision, changes: parseItems(changes, parseTreeChange) }
}
