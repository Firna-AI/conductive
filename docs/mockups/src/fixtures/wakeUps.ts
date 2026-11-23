/**
 * The wake-ups of the agent of Address autocomplete, the first session of
 * Checkout address autocomplete. With a workspace tool, the agent asks to
 * go on with its work at a later time, and ends its reply. The session then
 * shows each pending wake-up until its time. A wake-up then adds its line
 * of the app, which starts a turn or joins the running turn. A Cancel, and
 * a time at which no turn can start, add a line that ends it.
 */

import { code, p } from './agentText'
import type { AgentKey } from './agents'
import type { ChatItem } from './conversations'
import type { PersonKey } from './members'
import type { KeptLogin } from './secretRequests'

/**
 * Why a wake-up that reached its time could start no turn. `next-message`:
 * the member whom the turn acts for left the org, or the starter no longer
 * shares the login with that member, so the agent can go on at the next
 * message. `reconnect`: the login of the session is gone. The other two
 * name the cause: the session was closed, or the workspace was archived.
 */
export type WakeUpMissCause =
  | { kind: 'next-message' }
  | { kind: 'reconnect'; login: KeptLogin; agent: AgentKey }
  | { kind: 'session-closed' }
  | { kind: 'archived' }

type WakeUpBase = {
  kind: 'wake-up'
  id: string
  /** The time of the wake-up, in Unix milliseconds. */
  at: number
  /** The text that the agent set, which its turn gets after the lead. */
  text: string
}

/**
 * A wake-up of the agent, at the place of its line, in one of its states.
 * A pending one leaves the transcript, and the chat shows it above the
 * composer. A fired one is the line that starts a turn, or that joins the
 * turn that ran at its time, as a message during a turn does. A cancelled
 * one names the member who pressed Cancel, while that member is in the
 * org. A wake-up that could start no turn names why.
 */
export type WakeUpItem =
  | (WakeUpBase & {
      state: 'pending'
      /** The whole text shows, as after a press on it. */
      open?: true
    })
  | (WakeUpBase & { state: 'fired'; during?: true })
  | (WakeUpBase & { state: 'cancelled'; by?: PersonKey })
  | (WakeUpBase & { state: 'not-started'; miss: WakeUpMissCause })

/**
 * Now, for each page of the wake-ups: Monday 23 November 2026 at 17:40
 * UTC, which is 17:40 in London.
 */
export const wakeUpNow = Date.UTC(2026, 10, 23, 17, 40)

/**
 * The time zone of the browser of each reader. Cal reads in London, and
 * Priya and Jonas in Berlin, an hour later. Each reads the time of a
 * wake-up in their own local time.
 */
export const readerZones: Readonly<Record<PersonKey, string>> = {
  cal: 'Europe/London',
  priya: 'Europe/Berlin',
  jonas: 'Europe/Berlin',
}

/** The times of the wake-ups, in Unix milliseconds. */
export const wakeUpTimes = {
  /**
   * Friday 6 November at 09:00 in London, the morning after Cal archived
   * the workspace, as the bar of an archived workspace gives that day.
   */
  dayAfterArchive: Date.UTC(2026, 10, 6, 9, 0),
  /** Today at 09:00 in London, before now: a wake-up that came. */
  thisMorning: Date.UTC(2026, 10, 23, 9, 0),
  /** Today at 18:30 in London. */
  evening: Date.UTC(2026, 10, 23, 18, 30),
  /** Tomorrow at 00:30 in London, after the rate limit resets. */
  afterMidnight: Date.UTC(2026, 10, 24, 0, 30),
  /** Tomorrow at 09:00 in London. */
  tomorrow: Date.UTC(2026, 10, 24, 9, 0),
  /** Monday 30 November at 09:00 in London. */
  nextMonday: Date.UTC(2026, 10, 30, 9, 0),
} as const

/** The texts that the agent set for its wake-ups. */
export const wakeUpTexts = {
  checks:
    'Read the checks of pull request #482. If a check failed, read its log, fix the cause, and push the fix.',
  preview:
    'Open the preview of pull request #482, and check the address form at the width of a phone.',
  review:
    'If no one has reviewed pull request #482 yet, ask Priya Raman for a review in the pull request.',
  staging:
    'Run the end-to-end suite of checkout against the staging address provider with `npm run e2e -- checkout --provider=staging`. If it passes, add the table of its results to the description of pull request #482, and mark the pull request ready for review.\nIf a test fails, compare its requests with `tests/fixtures/provider-recording.json`, fix the cause in `src/app/checkout/AddressForm.tsx`, and push the fix. Keep the debounce of the lookups at 250 ms, and leave the rate limit settings of the provider as they are.',
} as const

function scheduled(id: string): ChatItem {
  const target = 'conductive wake-ups schedule'
  return { kind: 'tool', id, tool: 'run', target, status: 'done' }
}

/**
 * A turn of a member that ends after the agent set its wake-ups: `ask` is
 * the message, one tool call for each wake-up, and `answer` the reply. The
 * session then waits with no turn.
 */
function settingTurn(ask: string, calls: number, answer: string): ChatItem[] {
  return [
    { kind: 'user', id: 'set-ask', text: ask },
    ...Array.from({ length: calls }, (_, index) => scheduled(`set-${index}`)),
    { kind: 'agent', id: 'set-answer', blocks: [p(answer)] },
    { kind: 'turn-end', id: 'set-end', duration: '9s', files: [] },
  ]
}

/** The turn that sets one wake-up, to read the checks tomorrow morning. */
export const checksTurn = settingTurn(
  'The checks of #482 take a while. Check them tomorrow at 9 London time, and fix any failure.',
  1,
  'I set a wake-up for tomorrow at 09:00 London time. Then I read the checks of #482 and fix any failure.',
)

/** The turn that sets three wake-ups, for this evening, tomorrow, and Monday. */
export const threeTurn = settingTurn(
  'Check the preview of #482 on a phone this evening at 18:30, the checks tomorrow at 9, and ask Priya for a review next Monday at 9 if nobody reviewed it. London time.',
  3,
  'I set three wake-ups, London time: today at 18:30, tomorrow at 09:00, and Monday 30 November at 09:00.',
)

/** The turn that sets the wake-up of the long text, after the reset. */
export const stagingTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'set-ask',
    text: 'The staging address provider resets its rate limit at midnight UTC. After that, run the end-to-end suite against staging and finish #482.',
  },
  scheduled('set-0'),
  {
    kind: 'agent',
    id: 'set-answer',
    blocks: [
      p(
        'I set a wake-up for 00:30 UTC, after the reset. Then I run ',
        code('npm run e2e -- checkout --provider=staging'),
        ' and finish #482.',
      ),
    ],
  },
  { kind: 'turn-end', id: 'set-end', duration: '7s', files: [] },
]

/** The wake-up of the checks, in a state, as `checksTurn` set it. */
export function checksWakeUp(
  more:
    | { state: 'pending' }
    | { state: 'fired'; during?: true }
    | { state: 'cancelled'; by?: PersonKey },
): WakeUpItem {
  return {
    kind: 'wake-up',
    id: 'wake-up',
    at: wakeUpTimes.tomorrow,
    text: wakeUpTexts.checks,
    ...more,
  }
}

/**
 * The wake-up of the checks, which could start no turn at its time: this
 * morning, unless `at` gives another time.
 */
export function missedWakeUp(
  miss: WakeUpMissCause,
  at: number = wakeUpTimes.thisMorning,
): WakeUpItem {
  return {
    kind: 'wake-up',
    id: 'wake-up',
    at,
    text: wakeUpTexts.checks,
    state: 'not-started',
    miss,
  }
}
