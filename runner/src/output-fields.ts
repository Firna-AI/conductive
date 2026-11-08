import type {
  ChangedFile,
  FileEntry,
  RunnerFileEvent,
} from '../../src/shared/files'
import type { RunnerEvent } from '../../src/shared/runner'
import type { RetainedReport } from './report-state'

type FilterText = (value: string) => string

function fileEntry(entry: FileEntry, text: FilterText): FileEntry {
  return { ...entry, path: text(entry.path), name: text(entry.name) }
}

function changedFile<T extends ChangedFile>(file: T, text: FilterText): T {
  return {
    ...file,
    path: text(file.path),
    ...(file.previousPath === undefined
      ? {}
      : { previousPath: text(file.previousPath) }),
  }
}

export function filterFileReport(
  event: RunnerFileEvent,
  text: FilterText,
): RunnerFileEvent {
  if (event.type === 'files.snapshot')
    return {
      ...event,
      tree: {
        ...event.tree,
        entries: event.tree.entries.map((entry) => fileEntry(entry, text)),
      },
    }
  if (event.type === 'files.changed')
    return {
      ...event,
      delta: {
        ...event.delta,
        changes: event.delta.changes.map((change) => {
          if (change.operation === 'remove')
            return { ...change, path: text(change.path) }
          if (change.operation === 'move')
            return {
              ...change,
              previousPath: text(change.previousPath),
              entry: fileEntry(change.entry, text),
            }
          return { ...change, entry: fileEntry(change.entry, text) }
        }),
      },
    }
  if (event.type === 'changes.updated')
    return {
      ...event,
      changes: {
        ...event.changes,
        baseBranch: text(event.changes.baseBranch),
        files: event.changes.files.map((file) => changedFile(file, text)),
      },
    }
  return event
}

export function filterRetainedReport(
  event: RetainedReport,
  text: FilterText,
): RetainedReport {
  if (event.type === 'workspace.title')
    return { ...event, name: text(event.name) }
  return {
    ...event,
    start: {
      ...event.start,
      steps: event.start.steps.map((step) => ({
        ...step,
        label: text(step.label),
      })),
    },
  }
}

/** Filter displayed output without changing protocol fields or identities. */
export function filterOutput(
  event: RunnerEvent,
  text: FilterText,
): RunnerEvent {
  if (
    event.type === 'files.snapshot' ||
    event.type === 'files.changed' ||
    event.type === 'files.unavailable' ||
    event.type === 'changes.updated'
  )
    return filterFileReport(event, text)
  if (event.type === 'workspace.title' || event.type === 'start.updated')
    return filterRetainedReport(event, text)
  if (event.type === 'assistant.delta' || event.type === 'assistant.completed')
    return { ...event, text: text(event.text) }
  if (event.type === 'tool.updated')
    return {
      ...event,
      tool: {
        ...event.tool,
        target: text(event.tool.target),
        detail: event.tool.detail === null ? null : text(event.tool.detail),
      },
    }
  if (event.type === 'turn.completed')
    return {
      ...event,
      files: event.files.map((file) => changedFile(file, text)),
    }
  if (event.type === 'turn.failed')
    return {
      ...event,
      error: { ...event.error, message: text(event.error.message) },
    }
  return event
}
