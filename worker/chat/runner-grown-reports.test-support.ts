import type {
  FileEntry,
  FileEvent,
  RunnerFileEvent,
} from '../../src/shared/files'
import { jsonBytes } from '../../src/shared/event-limits'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { MemoryChatStorage } from './memory-storage.test-support'
import { createRunnerLimitsFixture } from './runner-limits.test-support'

export const grownEntries: readonly FileEntry[] = Array.from(
  { length: 960 },
  (_, index) => ({
    path: `${'a'.repeat(220)}/${'a'.repeat(219)}/file-${index}.txt`,
    displayPath: `${'[redacted]'.repeat(220)}/${'[redacted]'.repeat(219)}/file-${index}.txt`,
    name: `file-${index}.txt`,
    kind: 'file',
    change: null,
  }),
)

export function reportPart(
  kind: 'tree' | 'changes',
  partNumber: number,
): RunnerFileEvent {
  const entries = grownEntries
    .slice((partNumber - 1) * 480, partNumber * 480)
    .map(({ path, name, kind, change }) => ({ path, name, kind, change }))
  const part = { revision: 1, partNumber, partCount: 2 }
  if (kind === 'tree')
    return { type: 'files.snapshot', tree: { ...part, entries } }
  return {
    type: 'changes.updated',
    changes: {
      ...part,
      baseBranch: 'main',
      files: entries.map(({ path }) => ({
        path,
        change: 'modified',
        added: 1,
        removed: 0,
        uncommitted: true,
      })),
      summary: { files: 960, added: 960, removed: 0 },
    },
  }
}

export function completeReport(kind: 'tree' | 'changes'): FileEvent {
  if (kind === 'tree')
    return {
      type: 'files.snapshot',
      tree: { revision: 1, entries: grownEntries },
    }
  return {
    type: 'changes.updated',
    changes: {
      baseBranch: 'main',
      displayBaseBranch: 'm[redacted]in',
      files: grownEntries.map(({ path, displayPath }) => ({
        path,
        displayPath,
        change: 'modified',
        added: 1,
        removed: 0,
        uncommitted: true,
      })),
      summary: { files: 960, added: 960, removed: 0 },
    },
  }
}

export function capStorageValues(storage: MemoryChatStorage): void {
  storage.beforeCommit = async (staged) => {
    for (const value of staged.records.values()) {
      if (jsonBytes(value) > 2_097_152)
        throw new Error('Storage value exceeds the SQLite value limit.')
    }
  }
}

export function createGrownReportsFixture() {
  const sanitizer = new OutputSanitizer()
  sanitizer.add('a')
  return createRunnerLimitsFixture({
    filterRunnerOutput: async (_transaction, _workspace, input) => ({
      events: sanitizer
        .accept(input.event)
        .map((event) => ({ ...input, event })),
      save: async () => undefined,
    }),
  })
}
