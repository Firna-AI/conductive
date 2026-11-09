import { expect, it } from 'vitest'

import { OutputSanitizer } from '../../src/shared/output-sanitizer'

it('masks a secret that starts with the marker across deltas and preserves a standalone marker', () => {
  const output = new OutputSanitizer()
  output.add('[redacted]tail')
  output.add('a')
  output.add('[')
  const context = { sessionId: 'session-a', turnId: 'turn-a', messageId: 'a' }
  expect(
    output.accept({
      type: 'assistant.delta',
      ...context,
      text: '[redacted]',
    }),
  ).toEqual([])
  expect(
    output.accept({
      type: 'assistant.delta',
      ...context,
      text: 'tail production a',
    }),
  ).toEqual([
    {
      type: 'assistant.delta',
      ...context,
      text: '[redacted] production [redacted]',
    },
  ])
  expect(
    output.accept({
      type: 'assistant.completed',
      ...context,
      text: '[redacted]tail production a',
      userMessageIds: ['message-a'],
    }),
  ).toEqual([
    {
      type: 'assistant.completed',
      ...context,
      text: '[redacted] production [redacted]',
      userMessageIds: ['message-a'],
    },
  ])
  expect(
    output.retainedReport({
      type: 'workspace.title',
      name: '[redacted] production',
    }),
  ).toEqual({ type: 'workspace.title', name: '[redacted] production' })
})

it('masks only new text when a completed answer ends with a secret prefix', () => {
  const output = new OutputSanitizer()
  output.add('private-value')
  const context = { sessionId: 'session-a', turnId: 'turn-a', messageId: 'a' }
  const completion = {
    type: 'assistant.completed' as const,
    ...context,
    text: 'Final private-',
    userMessageIds: ['message-a'],
  }
  expect(output.accept(completion)).toEqual([completion])
  expect(
    output.accept({ type: 'assistant.delta', ...context, text: 'val' }),
  ).toEqual([])
  const restored = new OutputSanitizer(output.snapshot())
  expect(
    restored.accept({
      type: 'assistant.delta',
      ...context,
      text: 'ue and value',
    }),
  ).toEqual([
    { type: 'assistant.delta', ...context, text: '[redacted] and value' },
  ])
})

it('keeps a released prefix for text that arrives after the turn ends', () => {
  const context = { sessionId: 'session-a', turnId: 'turn-a', messageId: 'a' }
  const delta = { type: 'assistant.delta' as const, ...context }
  const output = new OutputSanitizer([
    { event: { ...delta, text: 'private-' }, secrets: ['private-value'] },
  ])
  const end = {
    type: 'turn.completed' as const,
    sessionId: context.sessionId,
    turnId: context.turnId,
    state: 'finished' as const,
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['message-a'],
  }
  expect(output.accept(end)).toEqual([{ ...delta, text: 'private-' }, end])
  const restored = new OutputSanitizer(output.snapshot())
  expect(restored.accept({ ...delta, text: 'value and value' })).toEqual([
    { ...delta, text: '[redacted] and value' },
  ])
})
