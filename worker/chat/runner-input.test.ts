import { expect, it, vi } from 'vitest'

import { parseRunnerEnvelope, parseRunnerTransport } from './runner-input'
import { numberedRunnerInput } from './runner-fixtures.test-support'

const context = { sessionId: 'session-1', turnId: 'turn-1' }
const tool = {
  ...context,
  type: 'tool.updated',
  tool: {
    id: 'test-output',
    kind: 'run',
    target: 'npm test',
    detail: 'One result 🙂',
    omittedDetailBytes: 8,
    state: 'done',
  },
}
const completed = {
  ...context,
  type: 'turn.completed',
  state: 'finished',
  durationMs: 25,
  files: [],
  omittedFileCount: 3,
  userMessageIds: ['message-1'],
}
const snapshot = {
  type: 'files.snapshot',
  tree: { revision: 4, partNumber: 1, partCount: 2, entries: [] },
}
const changes = {
  type: 'changes.updated',
  changes: {
    revision: 3,
    partNumber: 2,
    partCount: 2,
    baseBranch: 'main',
    files: [],
    summary: { files: 1, added: 2, removed: 0 },
  },
}

function envelope(event: unknown) {
  return {
    type: 'event',
    streamId: 'runner-stream',
    eventNumber: 1,
    occurredAt: 25,
    event,
  }
}

it('reads positive integer protocol versions before the handshake owns support', () => {
  const hello = {
    type: 'hello',
    workspaceId: 'workspace',
    streamId: 'stream',
  }
  for (const protocolVersion of [1, 2, 3])
    expect(parseRunnerTransport({ ...hello, protocolVersion })).toEqual({
      ...hello,
      protocolVersion,
      processStartId: null,
    })
  for (const protocolVersion of [0, -1, 0.5, '2', null, undefined])
    expect(() =>
      parseRunnerTransport({ ...hello, protocolVersion }),
    ).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_input' }),
    )
})

it('normalizes optional process-start diagnostics without refusing hello', () => {
  const hello = {
    type: 'hello',
    workspaceId: 'workspace',
    streamId: 'stream',
    protocolVersion: 2,
  }
  for (const [processStartId, expected] of [
    [undefined, null],
    [null, null],
    [
      'abcdef01-2345-4678-89ab-cdef01234567',
      'abcdef01-2345-4678-89ab-cdef01234567',
    ],
    ['ABCDEF01-2345-4678-89AB-CDEF01234567', 'unknown'],
    ['abcdef01-2345-1678-89ab-cdef01234567', 'unknown'],
    ['private-message-and-token', 'unknown'],
    ['', 'unknown'],
    [42, 'unknown'],
    [{ token: 'private-message-and-token' }, 'unknown'],
  ])
    expect(
      parseRunnerTransport({
        ...hello,
        processStartId,
        token: 'private-token',
      }),
    ).toEqual({ ...hello, processStartId: expected })
})

it('keeps only a true file server announcement and warns without its invalid value', () => {
  const hello = {
    type: 'hello',
    workspaceId: 'workspace',
    streamId: 'stream',
    protocolVersion: 2,
  }
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    for (const fileServer of [
      true,
      false,
      undefined,
      'private-token',
      null,
      1,
      {},
    ]) {
      warning.mockClear()
      expect(parseRunnerTransport({ ...hello, fileServer })).toEqual({
        ...hello,
        processStartId: null,
        ...(fileServer === true ? { fileServer: true } : {}),
      })
      expect(warning.mock.calls).toEqual(
        fileServer === undefined || typeof fileServer === 'boolean'
          ? []
          : [
              [
                {
                  kind: 'runner_file_server_invalid',
                  message:
                    'A runner hello had an invalid file server announcement. It counts as no file server.',
                },
              ],
            ],
      )
    }
  } finally {
    warning.mockRestore()
  }
})

it('preserves omission counts and a known optional turn end reason in runner chat events', () => {
  for (const event of [
    tool,
    completed,
    { ...completed, endReason: 'background_work_limit' },
  ]) {
    expect(
      parseRunnerEnvelope(
        numberedRunnerInput(envelope({ ...event, sdkOnly: 'discard' })),
      ),
    ).toEqual(envelope(event))
  }
  for (const endReason of ['future_reason', null, false]) {
    expect(
      parseRunnerEnvelope(
        numberedRunnerInput(envelope({ ...completed, endReason })),
      ),
    ).toEqual(envelope(completed))
  }
})

it('preserves numbered file report parts in runner messages', () => {
  for (const event of [snapshot, changes]) {
    expect(
      parseRunnerEnvelope(
        numberedRunnerInput(envelope({ ...event, sdkOnly: 'discard' })),
      ),
    ).toEqual(envelope(event))
  }
})

it('rejects missing or invalid new fields and workspace refusal markers', () => {
  const missing = [
    { ...tool, tool: { ...tool.tool, omittedDetailBytes: undefined } },
    { ...completed, omittedFileCount: undefined },
    { ...snapshot, tree: { ...snapshot.tree, partNumber: undefined } },
    { ...snapshot, tree: { ...snapshot.tree, partCount: undefined } },
    { ...changes, changes: { ...changes.changes, revision: undefined } },
    { ...changes, changes: { ...changes.changes, partNumber: undefined } },
    { ...changes, changes: { ...changes.changes, partCount: undefined } },
  ]
  const invalidCounts = [-1, 0.5, Number.MAX_SAFE_INTEGER + 1].map(
    (omittedDetailBytes) => ({
      ...tool,
      tool: { ...tool.tool, omittedDetailBytes },
    }),
  )
  const invalidParts = [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1].map(
    (partNumber) => ({ ...snapshot, tree: { ...snapshot.tree, partNumber } }),
  )
  const marker = {
    ...context,
    type: 'runner.event-refused',
    streamId: 'runner-stream',
    runnerEventNumber: 1,
    runnerEventType: 'tool.updated',
    reason: 'invalid',
  }
  for (const event of [...missing, ...invalidCounts, ...invalidParts, marker]) {
    expect(() =>
      parseRunnerEnvelope(numberedRunnerInput(envelope(event))),
    ).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_input' }),
    )
  }
})
