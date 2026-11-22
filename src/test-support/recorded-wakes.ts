import type { SessionWatchEndState } from '../shared/generated/SessionWatchEndState'
import type { SessionWatchNotice } from '../shared/generated/SessionWatchNotice'
import type { ToolCall } from '../shared/generated/ToolCall'
import type { TurnEndReason } from '../shared/generated/TurnEndReason'
import type { UserMessage } from '../shared/generated/UserMessage'
import type { ChatEvent } from '../shared/chat-events'
import { sessionLink } from '../shared/session-link'
import { FAKE_IDS, FAKE_ORIGIN, FAKE_TIME } from './fixtures/core'

/** The recorded chats of the session that a watched turn wakes. */
export type RecordedWakeScenario =
  | 'wake-finished'
  | 'wake-failed'
  | 'wake-stopped'
  | 'wake-other-workspace'
  | 'wake-during-turn'

/** A session that a watch names, by its workspace and its own ID. */
interface WatchedSession {
  workspaceId: string
  sessionId: string
}

/** The second session of the workspace, which takes the handed-out work. */
const debounce: WatchedSession = {
  workspaceId: FAKE_IDS.workspace,
  sessionId: 'debounce',
}

/** A session of another workspace, which a `Sent by:` line also names. */
const otherSession: WatchedSession = {
  workspaceId: 'fix-cart-flake',
  sessionId: 'debounce',
}

/** The link of a watched session in the app of the fake. */
const linkOf = (watched: WatchedSession) =>
  sessionLink(FAKE_ORIGIN, FAKE_IDS.org, watched.workspaceId, watched.sessionId)

/** The ID of the hidden message that carries the wake of a watch. */
const wakeMessageId = (watchId: string) => `session-watch:${watchId}`

/**
 * The notice of a wake, as the Worker writes it. `turnId` is the turn that
 * first took its hidden message.
 */
export function wakeNotice(
  watchId: string,
  turnId: string,
  state: SessionWatchEndState,
  watched: WatchedSession = debounce,
  reason: TurnEndReason | null = null,
): SessionWatchNotice {
  return {
    type: 'session.watch-notice',
    watchId,
    messageId: wakeMessageId(watchId),
    sessionId: FAKE_IDS.session,
    turnId,
    watchedWorkspaceId: watched.workspaceId,
    watchedSession: { id: watched.sessionId, link: linkOf(watched) },
    watchedTurnId: `${watched.sessionId}-turn`,
    state,
    reason,
  }
}

const at = (turnId: string) => ({ sessionId: FAKE_IDS.session, turnId })

/** A tool call of a turn, done unless `state` says otherwise. */
function call(
  turnId: string,
  kind: ToolCall['kind'],
  id: string,
  target: string,
  state: ToolCall['state'] = 'done',
): ChatEvent {
  const tool = { id, kind, target, detail: null, omittedDetailBytes: 0, state }
  return { ...at(turnId), type: 'tool.updated', tool }
}

function answered(
  turnId: string,
  messageId: string,
  text: string,
  userMessageIds: readonly string[],
): ChatEvent {
  return {
    ...at(turnId),
    type: 'assistant.completed',
    messageId,
    text,
    userMessageIds,
  }
}

function finished(
  turnId: string,
  durationMs: number,
  userMessageIds: readonly string[],
): ChatEvent {
  return {
    ...at(turnId),
    type: 'turn.completed',
    state: 'finished',
    durationMs,
    files: [],
    omittedFileCount: 0,
    userMessageIds,
  }
}

/**
 * The recorded chats of a session that gave work to another session with a
 * workspace tool, watched the turn of that session, and ended its reply.
 * The end of the watched turn wakes the session with a line of the app,
 * whose hidden message starts a new turn or joins the turn that runs. Each
 * chat follows the finished turn of `history`, as the mockups draw them at
 * `app/chat/wakes`. `message` is the first message of the session.
 */
export function recordedWakes(
  history: readonly ChatEvent[],
  message: UserMessage,
): Readonly<Record<RecordedWakeScenario, readonly ChatEvent[]>> {
  const asked = (id: string, text: string): ChatEvent => ({
    type: 'message.accepted',
    message: { ...message, id, text },
  })
  const started = (
    turnId: string,
    messageIds: readonly string[],
  ): ChatEvent => ({
    ...at(turnId),
    type: 'turn.started',
    senderId: message.sender.id,
    choice: message.choice,
    startedAt: FAKE_TIME,
    messageIds,
  })
  const handOff = (ask: string, tool: string, answer: string) => [
    asked('hand-off', ask),
    started('turn-2', ['hand-off']),
    call('turn-2', 'run', 'hand-out', tool),
    call('turn-2', 'run', 'watch-turn', 'conductive sessions watch'),
    answered('turn-2', 'handed-off', answer, ['hand-off']),
    finished('turn-2', 18_000, ['hand-off']),
  ]
  const toDebounce = handOff(
    'Give the debounce of the address lookups to a new session. When its turn ends, check its work.',
    'conductive sessions create',
    `I started ${linkOf(debounce)} with the debounce. This session goes on when its turn ends.`,
  )
  const read = (state: ToolCall['state']) =>
    call('turn-3', 'run', 'read-session', 'conductive sessions read', state)
  /** A wake whose hidden message starts a new turn, which reads the session. */
  const wakes = (notice: SessionWatchNotice): ChatEvent[] => [
    notice,
    started('turn-3', [notice.messageId]),
  ]
  const debounceWake = (state: SessionWatchEndState) =>
    wakeNotice('debounce-watch', 'turn-3', state)
  return {
    'wake-finished': [
      ...history,
      ...toDebounce,
      ...wakes(debounceWake('finished')),
      read('running'),
    ],
    'wake-failed': [
      ...history,
      ...toDebounce,
      ...wakes(debounceWake('failed')),
      read('done'),
      answered(
        'turn-3',
        'failed-answer',
        `The turn of ${linkOf(debounce)} failed before it changed a file, because Claude was overloaded. Should I send it the task again?`,
        [wakeMessageId('debounce-watch')],
      ),
      finished('turn-3', 11_000, [wakeMessageId('debounce-watch')]),
    ],
    'wake-stopped': [
      ...history,
      ...toDebounce,
      ...wakes(debounceWake('stopped')),
      read('running'),
    ],
    'wake-other-workspace': [
      ...history,
      ...handOff(
        'Ask the session of Fix flaky cart test to fill a restored address with `setAddress`, and to wait for the checks of its branch. When its turn ends, check its work.',
        'conductive sessions send',
        `I asked ${linkOf(otherSession)} to fill a restored address with \`setAddress\` and to wait for the checks of its branch. This session goes on when its turn ends.`,
      ),
      ...wakes(
        wakeNotice(
          'cart-watch',
          'turn-3',
          'finished',
          otherSession,
          'background_work_limit',
        ),
      ),
      read('running'),
    ],
    'wake-during-turn': [
      ...history,
      ...toDebounce,
      asked('postcode-ask', 'Add a test for an address without a postcode.'),
      started('turn-3', ['postcode-ask']),
      call('turn-3', 'edit', 'edit-test', 'tests/checkout/address.test.ts'),
      call('turn-3', 'run', 'postcode-test', 'npm test -- checkout'),
      debounceWake('finished'),
      {
        ...at('turn-3'),
        type: 'message.sent',
        messageId: wakeMessageId('debounce-watch'),
      },
      read('running'),
    ],
  }
}
