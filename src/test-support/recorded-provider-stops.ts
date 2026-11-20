import type { ChatEvent } from '../shared/chat-events'
import type { ToolCall } from '../shared/generated/ToolCall'
import type { UserMessage } from '../shared/generated/UserMessage'
import { FAKE_IDS, FAKE_TIME } from './fixtures/core'

/**
 * The recorded chats of a turn that a provider stop ended, as the mockups
 * draw them at `app/chat/cloud-computer-stops`. In each, the cloud computer
 * stopped during the tests of the first turn, and no member asked for the
 * stop. That turn ends as stopped with the end reason of the stop, and the
 * line after the stop says what comes next.
 *
 * - `cloud-computer-continued`: a continuation turn waited, and it ran the
 *   tests again and finished.
 * - `cloud-computer-login-gone`: no turn waits, because the login of the
 *   session is gone.
 * - `cloud-computer-stopped-again`: the cloud computer stopped the
 *   continuation turn soon after its start, so no further turn waits.
 */
export type ProviderStopScenario =
  | 'cloud-computer-continued'
  | 'cloud-computer-login-gone'
  | 'cloud-computer-stopped-again'

const session = FAKE_IDS.session
const continuation = { sessionId: session, turnId: 'turn-2' }

/** The run of the tests that each stop of the cloud computer cut off. */
const tests: ToolCall = {
  id: 'unit',
  kind: 'run',
  target: 'npm test',
  detail: null,
  omittedDetailBytes: 0,
  state: 'running',
}

/**
 * The end that the workspace gives a turn that a provider stop ended: no
 * duration and no files, because the runner sent no end.
 */
function stoppedByComputer(turnId: string, messageIds: string[]): ChatEvent {
  return {
    sessionId: session,
    turnId,
    type: 'turn.completed',
    state: 'stopped',
    endReason: 'cloud_computer_stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: messageIds,
  }
}

/** The line after the stop: the continuation turn, or no turn. */
function continued(
  previousTurnId: string,
  next: 'turn' | 'reconnect' | 'message',
): ChatEvent {
  const line = { type: 'turn.continued', sessionId: session, previousTurnId }
  return next === 'turn'
    ? { ...line, type: 'turn.continued', next, turnId: continuation.turnId }
    : { ...line, type: 'turn.continued', next, turnId: null }
}

/**
 * The start of the continuation turn, 10 minutes after the first turn. It
 * holds the message of the app, which the chat does not show.
 */
function continuationStart(message: UserMessage): ChatEvent[] {
  return [
    {
      ...continuation,
      type: 'turn.started',
      senderId: message.sender.id,
      choice: message.choice,
      startedAt: FAKE_TIME + 600_000,
      messageIds: ['continuation:turn-1'],
    },
    {
      ...continuation,
      type: 'assistant.completed',
      messageId: 'rerun',
      text: "The test run ended when the cloud computer stopped. I'll run it again.",
      userMessageIds: [],
    },
    { ...continuation, type: 'tool.updated', tool: { ...tests, id: 'again' } },
  ]
}

/**
 * The provider stop chats. `cutOff` is the first turn up to its tests,
 * which the stop cut off, and `message` is the message of that turn.
 */
export function providerStopRecords(
  cutOff: readonly ChatEvent[],
  message: UserMessage,
): Readonly<Record<ProviderStopScenario, readonly ChatEvent[]>> {
  const stopped = [
    ...cutOff,
    { sessionId: session, turnId: 'turn-1', type: 'tool.updated', tool: tests },
    stoppedByComputer('turn-1', [message.id]),
  ] as const satisfies readonly ChatEvent[]
  return {
    'cloud-computer-continued': [
      ...stopped,
      continued('turn-1', 'turn'),
      ...continuationStart(message),
      {
        ...continuation,
        type: 'tool.updated',
        tool: { ...tests, id: 'again', detail: '14 passed', state: 'done' },
      },
      {
        ...continuation,
        type: 'assistant.completed',
        messageId: 'done',
        text: 'Done. The checkout form suggests addresses, and the tests pass again after the stop.',
        userMessageIds: [],
      },
      {
        ...continuation,
        type: 'turn.completed',
        state: 'finished',
        durationMs: 158_000,
        files: [
          { path: 'README.md', change: 'modified', added: 4, removed: 1 },
        ],
        omittedFileCount: 0,
        userMessageIds: [],
      },
    ],
    'cloud-computer-login-gone': [...stopped, continued('turn-1', 'reconnect')],
    'cloud-computer-stopped-again': [
      ...stopped,
      continued('turn-1', 'turn'),
      ...continuationStart(message),
      stoppedByComputer(continuation.turnId, []),
      continued(continuation.turnId, 'message'),
    ],
  }
}
