import { expect, it } from 'vitest'

import { parseRunnerMessage } from './runner-input'

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

it('preserves positive omission counts in runner chat events', () => {
  for (const event of [tool, completed]) {
    expect(
      parseRunnerMessage(envelope({ ...event, sdkOnly: 'discard' })),
    ).toEqual(envelope(event))
  }
})

it('preserves numbered file report parts in runner messages', () => {
  for (const event of [snapshot, changes]) {
    expect(
      parseRunnerMessage(envelope({ ...event, sdkOnly: 'discard' })),
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
    expect(() => parseRunnerMessage(envelope(event))).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_input' }),
    )
  }
})
