import { expect, it } from 'vitest'

import { parseEnvelope } from '../stored-events'

it('keeps usable skill names in saved tool events without rejecting malformed metadata', () => {
  const envelope = {
    type: 'event',
    streamId: 'skill-stream',
    eventNumber: 1,
    occurredAt: 100,
    event: {
      type: 'tool.updated',
      sessionId: 'session-1',
      turnId: 'turn-1',
      tool: {
        id: 'skill-1',
        kind: 'other',
        target: 'brainstorming',
        detail: 'high',
        omittedDetailBytes: 0,
        state: 'done',
      },
    },
  }
  for (const { input, expected } of [
    {
      input: {
        skills: ['brainstorming', '', null, 42, 'conductor:conductor'],
      },
      expected: { skills: ['brainstorming', 'conductor:conductor'] },
    },
    { input: {}, expected: {} },
    { input: { skills: 'brainstorming' }, expected: {} },
    { input: { skills: [] }, expected: {} },
    { input: { skills: ['', null, 42] }, expected: {} },
  ]) {
    expect(
      parseEnvelope({
        ...envelope,
        event: {
          ...envelope.event,
          tool: { ...envelope.event.tool, ...input },
        },
      }),
      JSON.stringify(input),
    ).toStrictEqual({
      ...envelope,
      event: {
        ...envelope.event,
        tool: { ...envelope.event.tool, ...expected },
      },
    })
  }
})
