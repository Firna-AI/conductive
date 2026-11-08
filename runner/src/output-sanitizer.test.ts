import { expect, it } from 'vitest'

import { OutputSanitizer } from './output-sanitizer'

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
