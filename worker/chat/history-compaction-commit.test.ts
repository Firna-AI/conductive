import { expect, it } from 'vitest'

import { checkCommitBoundaries } from './commit-boundary.test-support'
import {
  choice,
  context,
  createRunnerLimitsFixture,
} from './runner-limits.test-support'

it('keeps first position indexes atomic with a completed answer receipt', async () => {
  await checkCommitBoundaries(async () => {
    const fixture = await createRunnerLimitsFixture()
    await fixture.receive(
      1,
      {
        ...context,
        type: 'turn.started',
        senderId: 'sender',
        choice,
        startedAt: 10,
        messageIds: [],
      },
      { occurredAt: 10 },
    )
    await fixture.receive(
      2,
      {
        ...context,
        type: 'assistant.delta',
        messageId: 'answer',
        text: 'partial',
      },
      { occurredAt: 11 },
    )
    return {
      storage: fixture.storage,
      action: async (error) => {
        await expect(
          fixture.receive(
            3,
            {
              ...context,
              type: 'assistant.completed',
              messageId: 'answer',
              text: 'Complete',
              userMessageIds: [],
            },
            { occurredAt: 15 },
          ),
        ).rejects.toThrow(error)
      },
      read: () =>
        fixture.read(async (view) => ({
          cursor: await view.cursor('stream'),
          text: (await view.history(0)).events.flatMap((envelope) =>
            envelope.event.type === 'assistant.delta' ||
            envelope.event.type === 'assistant.completed'
              ? [
                  {
                    number: envelope.eventNumber,
                    at: envelope.occurredAt,
                    text: envelope.event.text,
                  },
                ]
              : [],
          ),
        })),
      before: { cursor: 2, text: [{ number: 2, at: 11, text: 'partial' }] },
      after: {
        cursor: 3,
        text: [
          { number: 2, at: 11, text: '' },
          { number: 3, at: 15, text: 'Complete' },
        ],
      },
      restart: () => fixture.connect('stream', true),
    }
  })
})
