import type { Session } from '../../shared/generated/Session'
import type { UserMessage } from '../../shared/generated/UserMessage'
import type { WorkspaceEvent } from '../../shared/events'
import type { SendMessageResponse } from '../../shared/messages'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { anchorOf, explanation, recordEvent } from './explain-test-kit'

// The explanations that the DOM tests of the popover open: their records
// and their chats in the history of the fake.

/** The answer of each explanation of the tests. */
export const explanationAnswer =
  'When the places proxy finds no address, the fields stay empty and editable.'

/**
 * An explanation of a quote of the recorded answer, with its written
 * prompt and its answer. Its turn runs with `running`, and its tab is
 * closed with `closed`.
 */
export function explained(
  id: string,
  quote: string,
  options: { running?: boolean; closed?: boolean } = {},
): { record: Session; prompt: UserMessage; events: WorkspaceEvent[] } {
  const ask = workspaceFixtures().message
  const turn = { sessionId: id, turnId: `turn-${id}` }
  const startedAt = FAKE_TIME + 61_000
  const prompt: UserMessage = {
    ...ask,
    id: `prompt-${id}`,
    sessionId: id,
    text: `Explain "${quote}"\n\nKeep the answer short.`,
  }
  const record = explanation(id, anchorOf(quote), {
    activeTurnId: options.running ? turn.turnId : null,
    activeTurnStartedAt: options.running ? startedAt : null,
    closedAt: options.closed ? FAKE_TIME + 90_000 : null,
  })
  const ended: WorkspaceEvent[] = options.running
    ? []
    : [
        {
          ...turn,
          type: 'turn.completed',
          state: 'finished',
          durationMs: 14_000,
          userMessageIds: [prompt.id],
          files: [],
          omittedFileCount: 0,
        },
      ]
  return {
    record,
    prompt,
    events: [
      { type: 'message.accepted', message: prompt },
      {
        ...turn,
        type: 'turn.started',
        senderId: ask.sender.id,
        choice: ask.choice,
        startedAt,
        messageIds: [prompt.id],
      },
      {
        ...turn,
        type: 'assistant.completed',
        messageId: `answer-${id}`,
        text: explanationAnswer,
        userMessageIds: [prompt.id],
      },
      ...ended,
      recordEvent(record),
    ],
  }
}

/**
 * The reply of the Worker to a follow-up that `session` took, for the
 * message of the request.
 */
export async function followUpReply(
  request: Request,
  session: Session,
  eventNumber: number,
): Promise<SendMessageResponse> {
  const body: unknown = await request.json()
  const sent = typeof body === 'object' && body !== null ? body : {}
  const ask = workspaceFixtures().message
  return {
    eventNumber,
    session,
    turnId: session.activeTurnId,
    message: {
      ...ask,
      id: 'id' in sent && typeof sent.id === 'string' ? sent.id : 'follow-up',
      sessionId: session.id,
      text: 'text' in sent && typeof sent.text === 'string' ? sent.text : '',
      state: 'sent',
    },
  }
}
