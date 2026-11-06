import type {
  FileEvent,
  RunnerChangesPart,
  RunnerFileEvent,
  RunnerFileRevisionPart,
  RunnerFileTreePart,
} from '../../src/shared/files'

function collectParts<Part extends RunnerFileRevisionPart>(
  reports: Map<string, Map<number, Part>>,
  streamId: string,
  part: Part,
): readonly Part[] | null {
  const key = JSON.stringify([streamId, part.revision])
  for (const previous of reports.keys()) {
    if (previous !== key) reports.delete(previous)
  }
  const pending = reports.get(key) ?? new Map<number, Part>()
  reports.set(key, pending)
  pending.set(part.partNumber, structuredClone(part))
  if (pending.size !== part.partCount) return null
  const complete: Part[] = []
  for (let number = 1; number <= part.partCount; number++) {
    const next = pending.get(number)
    if (!next) return null
    complete.push(next)
  }
  reports.delete(key)
  return complete
}

/** Joins valid contract samples. Production validation belongs to the workspace. */
export class FakeRunnerFileReports {
  private readonly trees = new Map<string, Map<number, RunnerFileTreePart>>()
  private readonly changes = new Map<string, Map<number, RunnerChangesPart>>()
  private streamId: string | null = null

  beginStream(streamId: string): void {
    if (this.streamId === streamId) return
    this.trees.clear()
    this.changes.clear()
    this.streamId = streamId
  }

  discard(type: 'files.snapshot' | 'changes.updated'): void {
    if (type === 'files.snapshot') this.trees.clear()
    else this.changes.clear()
  }

  accept(streamId: string, event: RunnerFileEvent): FileEvent | null {
    if (event.type === 'files.changed') return structuredClone(event)
    if (event.type === 'files.snapshot') {
      const parts = collectParts(this.trees, streamId, event.tree)
      if (!parts) return null
      return {
        type: 'files.snapshot',
        tree: {
          revision: event.tree.revision,
          entries: parts.flatMap((part) => part.entries),
        },
      }
    }
    const parts = collectParts(this.changes, streamId, event.changes)
    if (!parts) return null
    return {
      type: 'changes.updated',
      changes: {
        baseBranch: event.changes.baseBranch,
        files: parts.flatMap((part) => part.files),
        summary: event.changes.summary,
      },
    }
  }
}
