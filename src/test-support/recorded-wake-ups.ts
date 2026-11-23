import type { ChatEvent } from '../shared/chat-events'
import type { ToolCall } from '../shared/generated/ToolCall'
import type { UserMessage } from '../shared/generated/UserMessage'
import type { WakeUpEnd } from '../shared/generated/WakeUpEnd'
import type { WakeUpFailure } from '../shared/generated/WakeUpFailure'
import { wakeUpTimeUtc } from '../../docs/mockups/src/components/chat/wakeUpCopy'
import { wakeUpTexts } from '../../docs/mockups/src/fixtures/wakeUps'
import { FAKE_IDS, FAKE_TIME } from './fixtures/core'
import { answered, call, finished } from './recorded-wakes'

/** The recorded chats of the wake-ups of an agent. */
export type RecordedWakeUpScenario =
  | 'wake-ups-pending'
  | 'wake-up-long'
  | 'wake-up-fired'
  | 'wake-up-during-turn'
  | 'wake-up-not-started'
  | 'wake-up-cancelled'

const hour = 3_600_000
/** The start of the day of the fake time, Friday 15 January 2027, in UTC. */
const today = FAKE_TIME - 8 * hour

/**
 * The times of the wake-ups, around the fake time, which is 08:00 UTC. In
 * London in January, the local time is UTC.
 */
export const wakeUpTimes = {
  /** Wednesday 13 January at 09:00, while the workspace was archived. */
  whileArchived: today - 39 * hour,
  yesterdayMorning: today - 15 * hour,
  yesterdayEvening: today - 5.5 * hour,
  earlyToday: today + 6 * hour,
  thisMorning: today + 7 * hour,
  sevenThirty: today + 7.5 * hour,
  evening: today + 18.5 * hour,
  afterMidnight: today + 24.5 * hour,
  tomorrow: today + 33 * hour,
  /** Monday 18 January at 09:00. */
  nextMonday: today + 81 * hour,
} as const

const session = FAKE_IDS.session

/** The ID of the hidden message that carries a wake-up, as the Worker names it. */
const wakeUpMessageId = (id: string) => `session-wake-up:${id}`

/** The event of a wake-up that an agent set, as the Worker writes it. */
export function wakeUpScheduled(id: string, at: number, text: string) {
  const wakeUp = { id, at, atUtc: wakeUpTimeUtc(at), text }
  return {
    type: 'session.wake-up-scheduled',
    sessionId: session,
    wakeUp,
  } as const satisfies ChatEvent
}

/** The event of a wake-up that fired, whose message `turnId` took first. */
export function wakeUpFired(id: string, turnId: string, text: string) {
  return {
    type: 'session.wake-up-fired',
    sessionId: session,
    wakeUpId: id,
    messageId: wakeUpMessageId(id),
    turnId,
    text,
  } as const satisfies ChatEvent
}

/** The event of a wake-up that ended with no turn. */
export function wakeUpEnded(id: string, at: number, outcome: WakeUpEnd) {
  return {
    type: 'session.wake-up-ended',
    sessionId: session,
    wakeUpId: id,
    at,
    outcome,
  } as const satisfies ChatEvent
}

const run = (
  turnId: string,
  id: string,
  target: string,
  state?: ToolCall['state'],
) => call(turnId, 'run', id, target, state)

/**
 * The recorded chats of the wake-ups of the agent of the first session,
 * as the mockups draw them at `app/chat/wake-ups`. Each follows the
 * finished turn of `history`, and a turn in which the agent set its
 * wake-ups with the workspace tools and ended its reply. `message` is the
 * first message of the session.
 */
export function recordedWakeUps(
  history: readonly ChatEvent[],
  message: UserMessage,
): Readonly<Record<RecordedWakeUpScenario, readonly ChatEvent[]>> {
  const asked = (id: string, text: string): ChatEvent => ({
    type: 'message.accepted',
    message: { ...message, id, text },
  })
  const started = (
    turnId: string,
    messageIds: readonly string[],
  ): ChatEvent => ({
    sessionId: session,
    turnId,
    type: 'turn.started',
    senderId: message.sender.id,
    choice: message.choice,
    startedAt: FAKE_TIME,
    messageIds,
  })
  /** A turn that sets each of `wakeUps`, then ends with `answer`. */
  const setting = (
    ask: string,
    wakeUps: readonly (readonly [string, number, string])[],
    answer: string,
  ): ChatEvent[] => [
    ...history,
    asked('set-ask', ask),
    started('turn-2', ['set-ask']),
    ...wakeUps.flatMap(([id, at, text]) => [
      run('turn-2', `set-${id}`, 'conductive wake-ups schedule'),
      wakeUpScheduled(id, at, text),
    ]),
    answered('turn-2', 'set-answer', answer, ['set-ask']),
    finished('turn-2', 9_000, ['set-ask']),
  ]
  const checks = setting(
    'The checks of #482 take a while. Check them tomorrow at 07:30 London time, and fix any failure.',
    [['checks', wakeUpTimes.sevenThirty, wakeUpTexts.checks]],
    'I set a wake-up for tomorrow at 07:30 London time. Then I read the checks of #482 and fix any failure.',
  )
  const three: (readonly [string, number, string])[] = [
    ['checks', wakeUpTimes.tomorrow, wakeUpTexts.checks],
    ['preview', wakeUpTimes.evening, wakeUpTexts.preview],
    ['review', wakeUpTimes.nextMonday, wakeUpTexts.review],
  ]
  const fired = wakeUpFired('checks', 'turn-3', wakeUpTexts.checks)
  const readChecks = run('turn-3', 'checks-read', 'gh pr checks 482', 'running')
  const member = (memberId: string): WakeUpEnd => ({
    kind: 'cancelled',
    source: { kind: 'member', memberId },
  })
  const missed = (reason: WakeUpFailure): WakeUpEnd => ({
    kind: 'could-not-start',
    reason,
  })
  return {
    'wake-ups-pending': setting(
      'Check the preview of #482 on a phone this evening at 18:30, the checks tomorrow at 9, and ask Priya for a review next Monday at 9 if nobody reviewed it. London time.',
      three,
      'I set three wake-ups, London time: today at 18:30, tomorrow at 09:00, and Monday 18 January at 09:00.',
    ),
    'wake-up-long': setting(
      'The staging address provider resets its rate limit at midnight UTC. After that, run the end-to-end suite against staging and finish #482.',
      [['staging', wakeUpTimes.afterMidnight, wakeUpTexts.staging]],
      'I set a wake-up for 00:30 UTC, after the reset. Then I run `npm run e2e -- checkout --provider=staging` and finish #482.',
    ),
    'wake-up-fired': [
      ...checks,
      fired,
      started('turn-3', [fired.messageId]),
      readChecks,
    ],
    'wake-up-during-turn': [
      ...checks,
      asked('postcode-ask', 'Add a test for an address without a postcode.'),
      started('turn-3', ['postcode-ask']),
      call('turn-3', 'edit', 'postcode-edit', 'tests/checkout/address.test.ts'),
      run('turn-3', 'postcode-test', 'npm test -- checkout'),
      fired,
      {
        sessionId: session,
        turnId: 'turn-3',
        type: 'message.sent',
        messageId: fired.messageId,
      },
      readChecks,
    ],
    'wake-up-not-started': [
      ...setting(
        'Read the plan in `docs/checks-plan.md`, and set a wake-up for each check in it.',
        [
          ['archived', wakeUpTimes.whileArchived, wakeUpTexts.checks],
          ['personal', wakeUpTimes.yesterdayMorning, wakeUpTexts.checks],
          ['org', wakeUpTimes.yesterdayEvening, wakeUpTexts.preview],
          ['sender', wakeUpTimes.earlyToday, wakeUpTexts.review],
          ['closed', wakeUpTimes.thisMorning, wakeUpTexts.checks],
        ],
        'I set five wake-ups, one for each check in the plan.',
      ),
      wakeUpEnded(
        'archived',
        wakeUpTimes.whileArchived,
        missed({ kind: 'archived' }),
      ),
      wakeUpEnded(
        'personal',
        wakeUpTimes.yesterdayMorning,
        missed({
          kind: 'login-unavailable',
          agent: 'claude',
          owner: { type: 'personal', userId: message.sender.id },
        }),
      ),
      wakeUpEnded(
        'org',
        wakeUpTimes.yesterdayEvening,
        missed({
          kind: 'login-unavailable',
          agent: 'claude',
          owner: { type: 'org', orgId: FAKE_IDS.org },
        }),
      ),
      wakeUpEnded(
        'sender',
        wakeUpTimes.earlyToday,
        missed({ kind: 'sender-unavailable' }),
      ),
      wakeUpEnded(
        'closed',
        wakeUpTimes.thisMorning,
        missed({ kind: 'session-closed' }),
      ),
    ],
    'wake-up-cancelled': [
      ...setting(
        'Check the preview of #482 on a phone this evening at 18:30, the checks tomorrow at 9, the staging suite after the rate limit resets at midnight UTC, and ask Priya for a review next Monday at 9 if nobody reviewed it. London time.',
        [...three, ['staging', wakeUpTimes.afterMidnight, wakeUpTexts.staging]],
        'I set four wake-ups, London time: today at 18:30, tomorrow at 00:30 and at 09:00, and Monday 18 January at 09:00.',
      ),
      wakeUpEnded('checks', wakeUpTimes.tomorrow, member('priya')),
      wakeUpEnded('staging', wakeUpTimes.afterMidnight, {
        kind: 'cancelled',
        source: {
          kind: 'session',
          workspaceId: FAKE_IDS.workspace,
          sessionId: 'debounce',
        },
      }),
      wakeUpEnded('review', wakeUpTimes.nextMonday, member('former-member')),
    ],
  }
}
