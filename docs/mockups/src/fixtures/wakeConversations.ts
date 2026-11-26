import type { TextBlock } from '../../../../src/chat/markdown/agent-blocks'
import type { TurnEndReason } from '../../../../src/shared/generated/TurnEndReason'
import type { SessionWatchEndState } from '../../../../src/shared/generated/SessionWatchEndState'
import { code, p } from './agentText'
import type { ChatItem } from './conversations'
import {
  autocompleteSessions,
  savedCartsSession,
  sessionLink,
  type LinkableSession,
} from './sessionLinks'

/**
 * The line of the app that wakes a session when a turn that it watched
 * ends. It names the watched session with its chip, the end of its turn,
 * and the end reason when that end names one. It is not a message of a
 * member.
 */
export type WakeItem = {
  kind: 'wake'
  id: string
  /** The session link of the watched session, which shows as its chip. */
  session: string
  /** How the watched turn ended. */
  end: SessionWatchEndState
  /** The end reason that the end of the watched turn names. */
  reason?: TurnEndReason
  /**
   * A turn of this session ran when the watched turn ended, so the line
   * joins that turn as a new part, as a message during a turn does.
   */
  during?: true
}

/** The keys of the chats of wakes, for the workspace state. */
export const wakeConversationKeys = [
  'wake-finished',
  'wake-failed',
  'wake-stopped',
  'wake-other-workspace',
  'wake-during-turn',
] as const

type WakeConversationKey = (typeof wakeConversationKeys)[number]

const { debounce } = autocompleteSessions

function done(id: string, target: string, detail?: string): ChatItem {
  return { kind: 'tool', id, tool: 'run', target, detail, status: 'done' }
}

function wake(
  session: LinkableSession,
  end: SessionWatchEndState,
  more: Pick<WakeItem, 'reason' | 'during'> = {},
): WakeItem {
  return {
    kind: 'wake',
    id: 'wake',
    session: sessionLink(session),
    end,
    ...more,
  }
}

/**
 * The turn of Address autocomplete that gives the work to a session and
 * watches the turn of that session. `ask` is the message of Cal, `call` the
 * tool call that hands out the work, and `answer` the reply. The agent then
 * ends its reply, so the turn ends, and the session waits with no turn.
 */
function handOff(ask: string, call: string, answer: TextBlock): ChatItem[] {
  return [
    { kind: 'user', id: 'hand-off', text: ask },
    done('hand-out', call),
    done('watch-turn', 'conductive sessions watch'),
    { kind: 'agent', id: 'handed-off', blocks: [answer] },
    { kind: 'turn-end', id: 'hand-off-end', duration: '18s', files: [] },
  ]
}

/** The debounce, given to the second session of the workspace. */
const debounceHandOff = handOff(
  'Give the debounce of the address lookups to a new session. When its turn ends, check its work.',
  'conductive sessions create',
  p(
    `I started ${sessionLink(debounce)} with the debounce. This session goes on when its turn ends.`,
  ),
)

/** The restored address, given to the session of Saved carts, `W-402`. */
const savedCartsHandOff = handOff(
  'Ask Saved carts to fill a restored address with `setAddress`, and to wait for the checks of its branch. When its turn ends, check its work.',
  'conductive sessions send',
  p(
    `I asked ${sessionLink(savedCartsSession)} to fill a restored address with `,
    code('setAddress'),
    ' and to wait for the checks of its branch. This session goes on when its turn ends.',
  ),
)

/** The turn that a wake starts, or joins, while it reads the session. */
function reading(elapsed: string): ChatItem[] {
  return [
    {
      kind: 'tool',
      id: 'read-session',
      tool: 'run',
      target: 'conductive sessions read',
      status: 'running',
    },
    { kind: 'working', id: 'working', elapsed },
  ]
}

/**
 * The turn after the failed turn. The agent read the watched session and
 * asks before it sends the task again. The answer gives the cause that the
 * agent read, which the line of the wake does not show.
 */
const failedAnswer: readonly ChatItem[] = [
  done('read-session', 'conductive sessions read'),
  {
    kind: 'agent',
    id: 'failed-answer',
    blocks: [
      p(
        `The turn of ${sessionLink(debounce)} failed before it changed a file, because Claude was overloaded. Should I send it the task again?`,
      ),
    ],
  },
  { kind: 'turn-end', id: 'failed-end', duration: '11s', files: [] },
]

/**
 * A turn that Cal started after the hand-off. The watched turn finished
 * while it ran, so the line of the wake joins it as a new part.
 */
const postcodeTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'postcode-ask',
    text: 'Add a test for an address without a postcode.',
  },
  {
    kind: 'tool',
    id: 'edit-test',
    tool: 'edit',
    target: 'tests/checkout/address.test.ts',
    detail: '+12',
    status: 'done',
  },
  done('postcode-test', 'npm test -- checkout', '17 passed'),
  wake(debounce, 'finished', { during: true }),
  ...reading('1m 52s'),
]

/**
 * The chats of Address autocomplete, the first session of Checkout address
 * autocomplete, after `history`, its finished first turn. The session gave
 * work to another session, watched its turn, and ended its reply. The end
 * of the watched turn then wakes it with a line of the app.
 */
export function wakeConversations(history: readonly ChatItem[]) {
  return {
    'wake-finished': [
      ...history,
      ...debounceHandOff,
      wake(debounce, 'finished'),
      ...reading('6s'),
    ],
    'wake-failed': [
      ...history,
      ...debounceHandOff,
      wake(debounce, 'failed'),
      ...failedAnswer,
    ],
    'wake-stopped': [
      ...history,
      ...debounceHandOff,
      wake(debounce, 'stopped'),
      ...reading('4s'),
    ],
    'wake-other-workspace': [
      ...history,
      ...savedCartsHandOff,
      wake(savedCartsSession, 'finished', { reason: 'background_work_limit' }),
      ...reading('5s'),
    ],
    'wake-during-turn': [...history, ...debounceHandOff, ...postcodeTurn],
  } as const satisfies Record<WakeConversationKey, readonly ChatItem[]>
}
