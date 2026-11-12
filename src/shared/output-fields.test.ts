import { expect, it } from 'vitest'
import type { RunnerEvent } from './runner'
import { OutputSanitizer } from './output-sanitizer'

it('masks each skill name with the output filter and keeps an absent skills field absent', () => {
  const output = new OutputSanitizer()
  output.add('turn-token-private')
  const event: RunnerEvent = {
    type: 'tool.updated',
    sessionId: 'session',
    turnId: 'turn',
    tool: {
      id: 'skill',
      kind: 'other',
      target: 'conductor:turn-token-private',
      detail: 'turn-token-private high',
      omittedDetailBytes: 0,
      state: 'done',
    },
  }
  expect(
    output.accept({
      ...event,
      tool: {
        ...event.tool,
        skills: [
          'brainstorming',
          'conductor:turn-token-private',
          'turn-token-private',
        ],
      },
    }),
  ).toEqual([
    {
      ...event,
      tool: {
        ...event.tool,
        target: 'conductor:[redacted]',
        detail: '[redacted] high',
        skills: ['brainstorming', 'conductor:[redacted]', '[redacted]'],
      },
    },
  ])
  expect(output.accept(event)).toEqual([
    {
      ...event,
      tool: {
        ...event.tool,
        target: 'conductor:[redacted]',
        detail: '[redacted] high',
      },
    },
  ])
})
