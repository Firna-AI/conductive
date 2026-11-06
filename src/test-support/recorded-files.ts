import type { WorkspaceEventEnvelope } from '../shared/events'
import type { ChangesResponse, FileEvent } from '../shared/files'
import type {
  RunnerFileCommand,
  RunnerFileResponse,
} from '../shared/runner-files'
import { FAKE_IDS, FAKE_TIME } from './fixtures/core'
import { FAKE_FILE_PATH, toolFixtures } from './fixtures/tools'

const data = toolFixtures()
const changed: ChangesResponse = {
  ...data.changes,
  files: [
    ...data.changes.files.map((file) =>
      file.path === 'README.md'
        ? {
            ...file,
            path: 'docs/README.md',
            previousPath: 'README.md',
            change: 'renamed' as const,
          }
        : file,
    ),
    {
      path: 'notes.txt',
      change: 'untracked',
      added: 3,
      removed: 0,
      uncommitted: true,
    },
    {
      path: '.env.example',
      change: 'deleted',
      added: 0,
      removed: 2,
      uncommitted: true,
    },
  ],
  summary: { files: 7, added: 161, removed: 50 },
}

/** Full tree on connection, then file creation, move, and removal. */
export const recordedRunnerFileEvents: readonly FileEvent[] = [
  { type: 'files.snapshot', tree: data.files },
  { type: 'changes.updated', changes: data.changes },
  {
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path: 'notes.txt',
            name: 'notes.txt',
            kind: 'file',
            change: 'untracked',
          },
        },
        {
          operation: 'upsert',
          entry: {
            path: 'docs',
            name: 'docs',
            kind: 'directory',
            change: null,
          },
        },
        {
          operation: 'move',
          previousPath: 'README.md',
          entry: {
            path: 'docs/README.md',
            name: 'README.md',
            kind: 'file',
            change: 'renamed',
          },
        },
        { operation: 'remove', path: '.env.example' },
      ],
    },
  },
  { type: 'changes.updated', changes: changed },
]

export function recordedFileEvents(
  workspaceId: string = FAKE_IDS.workspace,
  firstEventNumber = 1,
): readonly WorkspaceEventEnvelope[] {
  return recordedRunnerFileEvents.map((event, index) => ({
    workspaceId,
    eventNumber: firstEventNumber + index,
    occurredAt: FAKE_TIME + index * 1_000,
    event: structuredClone(event),
  }))
}

export const recordedFileRequests: readonly RunnerFileCommand[] = [
  {
    type: 'file.read',
    requestId: 'read-1',
    path: FAKE_FILE_PATH,
    maxBytes: 65_536,
  },
  {
    type: 'file.diff',
    requestId: 'diff-1',
    path: FAKE_FILE_PATH,
    defaultBranch: 'main',
  },
  {
    type: 'file.read',
    requestId: 'read-limit',
    path: FAKE_FILE_PATH,
    maxBytes: 16,
  },
]

export const recordedFileResponses: readonly RunnerFileResponse[] = [
  {
    type: 'file.read.result',
    requestId: 'read-1',
    result: { ok: true, file: data.content },
  },
  {
    type: 'file.diff.result',
    requestId: 'diff-1',
    result: { ok: true, diff: data.diff },
  },
  {
    type: 'file.read.result',
    requestId: 'read-limit',
    result: {
      ok: false,
      error: {
        code: 'file_too_large',
        message: 'The file is too large to open.',
        sizeBytes: data.content.sizeBytes,
        limitBytes: 16,
      },
    },
  },
]
