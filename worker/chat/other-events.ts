import type { FileEntry, FileTreeChange } from '../../src/shared/files'
import type { RunnerEvent } from '../../src/shared/runner'
import type { StartStep } from '../../src/shared/workspaces'
import { array, changedFile, changeKind } from './agent-events'
import {
  counter,
  identifier,
  invalidInput,
  number,
  record,
  string,
} from './inputs'

function fileEntry(value: unknown): FileEntry {
  const input = record(value)
  if (input.kind !== 'file' && input.kind !== 'directory') return invalidInput()
  return {
    path: string(input.path),
    name: string(input.name),
    kind: input.kind,
    change: input.change === null ? null : changeKind(input.change),
  }
}

function fileChange(value: unknown): FileTreeChange {
  const input = record(value)
  if (input.operation === 'remove')
    return { operation: input.operation, path: string(input.path) }
  if (input.operation === 'upsert')
    return { operation: input.operation, entry: fileEntry(input.entry) }
  if (input.operation === 'move')
    return {
      operation: input.operation,
      previousPath: string(input.previousPath),
      entry: fileEntry(input.entry),
    }
  return invalidInput()
}

function startStep(value: unknown): StartStep {
  const input = record(value)
  if (
    input.state !== 'running' &&
    input.state !== 'completed' &&
    input.state !== 'failed'
  )
    return invalidInput()
  return {
    id: identifier(input.id),
    label: string(input.label),
    state: input.state,
    startedAt: number(input.startedAt),
    completedAt: input.completedAt === null ? null : number(input.completedAt),
  }
}

function positiveCounter(value: unknown): number {
  const result = counter(value)
  if (result === 0) return invalidInput()
  return result
}

/** These events share numbering with chat. Their feature owners keep projections. */
export function parseOtherEvent(value: unknown): RunnerEvent | null {
  const input = record(value)
  switch (input.type) {
    case 'runner.ready':
      return { type: input.type }
    case 'workspace.title':
      return { type: input.type, name: string(input.name) }
    case 'start.updated': {
      const start = record(input.start)
      if (start.kind !== 'create' && start.kind !== 'resume')
        return invalidInput()
      return {
        type: input.type,
        start: {
          kind: start.kind,
          startedAt: number(start.startedAt),
          steps: array(start.steps, startStep),
        },
      }
    }
    case 'files.snapshot': {
      const tree = record(input.tree)
      return {
        type: input.type,
        tree: {
          revision: counter(tree.revision),
          partNumber: positiveCounter(tree.partNumber),
          partCount: positiveCounter(tree.partCount),
          entries: array(tree.entries, fileEntry),
        },
      }
    }
    case 'files.changed': {
      const delta = record(input.delta)
      return {
        type: input.type,
        delta: {
          revision: counter(delta.revision),
          changes: array(delta.changes, fileChange),
        },
      }
    }
    case 'changes.updated': {
      const changes = record(input.changes)
      const summary = record(changes.summary)
      return {
        type: input.type,
        changes: {
          revision: positiveCounter(changes.revision),
          partNumber: positiveCounter(changes.partNumber),
          partCount: positiveCounter(changes.partCount),
          baseBranch: string(changes.baseBranch),
          files: array(changes.files, (entry) => {
            const file = record(entry)
            if (typeof file.uncommitted !== 'boolean') return invalidInput()
            return { ...changedFile(file), uncommitted: file.uncommitted }
          }),
          summary: {
            files: counter(summary.files),
            added: number(summary.added),
            removed: number(summary.removed),
          },
        },
      }
    }
    default:
      return null
  }
}
