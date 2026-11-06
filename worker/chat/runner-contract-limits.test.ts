import { expect, it } from 'vitest'

import {
  TOOL_DETAIL_MAX_BYTES,
  TURN_COMPLETED_FILES_MAX_BYTES,
  TURN_COMPLETED_MAX_FILES,
} from '../../src/shared/chat-events'
import {
  FILE_EVENT_MAX_BYTES,
  FILE_TREE_DELTA_MAX_CHANGES,
} from '../../src/shared/files'
import { parseRunnerMessage } from './runner-input'
import { context, file, snapshot } from './runner-limits.test-support'

const envelope = (event: unknown) => ({
  type: 'event',
  streamId: 'stream',
  eventNumber: 1,
  occurredAt: 25,
  event,
})
const changedFile = (path: string) => ({
  path,
  change: 'modified',
  added: 0,
  removed: 0,
})
const complete = (files: unknown[]) => ({
  type: 'turn.completed',
  ...context,
  state: 'finished',
  durationMs: 0,
  files,
  omittedFileCount: 0,
  userMessageIds: [],
})
const tool = (detail: string | null, omittedDetailBytes = 0) => ({
  type: 'tool.updated',
  ...context,
  tool: {
    id: 'tool',
    kind: 'run',
    target: 'test',
    detail,
    omittedDetailBytes,
    state: 'done',
  },
})

it('enforces tool detail bytes and bounded unique turn summary files at their contract limits', () => {
  expect(
    parseRunnerMessage(envelope(tool('x'.repeat(TOOL_DETAIL_MAX_BYTES - 2)))),
  ).toEqual(envelope(tool('x'.repeat(TOOL_DETAIL_MAX_BYTES - 2))))
  expect(() =>
    parseRunnerMessage(envelope(tool('x'.repeat(TOOL_DETAIL_MAX_BYTES - 1)))),
  ).toThrowError(expect.objectContaining({ code: 'runner_event_too_large' }))
  expect(() => parseRunnerMessage(envelope(tool(null, 1)))).toThrowError(
    expect.objectContaining({ code: 'invalid_input' }),
  )
  const files = Array.from({ length: TURN_COMPLETED_MAX_FILES }, (_, index) =>
    changedFile(`file-${index}`),
  )
  expect(parseRunnerMessage(envelope(complete(files)))).toEqual(
    envelope(complete(files)),
  )
  expect(() =>
    parseRunnerMessage(envelope(complete([...files, changedFile('extra')]))),
  ).toThrowError(expect.objectContaining({ code: 'runner_event_too_large' }))
  expect(() =>
    parseRunnerMessage(
      envelope(complete([changedFile('same'), changedFile('same')])),
    ),
  ).toThrowError(expect.objectContaining({ code: 'invalid_input' }))
  expect(() =>
    parseRunnerMessage(
      envelope(
        complete([changedFile('x'.repeat(TURN_COMPLETED_FILES_MAX_BYTES))]),
      ),
    ),
  ).toThrowError(expect.objectContaining({ code: 'runner_event_too_large' }))
})

it('enforces file payload bytes, part numbers, and bounded tree deltas', () => {
  const event = snapshot(1, 1, 1, ['small'])
  const emptyBytes = new TextEncoder().encode(
    JSON.stringify({ ...event, extra: '' }),
  ).length
  expect(
    parseRunnerMessage(
      envelope({
        ...event,
        extra: 'x'.repeat(FILE_EVENT_MAX_BYTES - emptyBytes),
      }),
    ),
  ).toEqual(envelope(event))
  expect(() =>
    parseRunnerMessage(
      envelope({
        ...event,
        extra: 'x'.repeat(FILE_EVENT_MAX_BYTES - emptyBytes + 1),
      }),
    ),
  ).toThrowError(expect.objectContaining({ code: 'runner_event_too_large' }))
  const changes = Array.from(
    { length: FILE_TREE_DELTA_MAX_CHANGES },
    (_, index) => ({ operation: 'upsert', entry: file(`file-${index}`) }),
  )
  const delta = { type: 'files.changed', delta: { revision: 2, changes } }
  expect(parseRunnerMessage(envelope(delta))).toEqual(envelope(delta))
  expect(() =>
    parseRunnerMessage(
      envelope({
        ...delta,
        delta: {
          ...delta.delta,
          changes: [...changes, { operation: 'remove', path: 'extra' }],
        },
      }),
    ),
  ).toThrowError(expect.objectContaining({ code: 'runner_event_too_large' }))
  for (const invalid of [snapshot(0, 1, 1, []), snapshot(1, 2, 1, [])]) {
    expect(() => parseRunnerMessage(envelope(invalid))).toThrowError(
      expect.objectContaining({ code: 'invalid_input' }),
    )
  }
})

it('counts discarded fields in the serialized raw turn file list', () => {
  const event = complete([
    {
      ...changedFile('small'),
      discarded: 'x'.repeat(TURN_COMPLETED_FILES_MAX_BYTES),
    },
  ])
  expect(() => parseRunnerMessage(envelope(event))).toThrowError(
    expect.objectContaining({ code: 'runner_event_too_large' }),
  )
})
