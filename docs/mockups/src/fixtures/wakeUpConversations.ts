import { p } from './agentText'
import type { ChatItem } from './conversations'
import {
  checksTurn,
  checksWakeUp,
  missedWakeUp,
  stagingTurn,
  threeTurn,
  wakeUpTexts,
  wakeUpTimes,
  type WakeUpItem,
} from './wakeUps'

/** The keys of the chats of wake-ups, for the workspace state. */
export const wakeUpConversationKeys = [
  'wake-up-pending',
  'wake-ups-pending',
  'wake-up-long',
  'wake-up-long-open',
  'wake-up-fired',
  'wake-up-fired-ended',
  'wake-up-during-turn',
  'wake-up-starting',
  'wake-up-reconnect',
  'wake-up-reconnect-org',
  'wake-up-next-message',
  'wake-up-closed',
  'wake-up-archived',
  'wake-up-cancelled',
  'wake-up-cancelled-one',
  'wake-up-cancelled-left',
] as const

type WakeUpConversationKey = (typeof wakeUpConversationKeys)[number]

/** The chats of wake-ups whose turn in this session runs. */
export const wakeUpRunningConversations: readonly WakeUpConversationKey[] = [
  'wake-up-fired',
  'wake-up-during-turn',
]

function done(id: string, target: string, detail?: string): ChatItem {
  return { kind: 'tool', id, tool: 'run', target, detail, status: 'done' }
}

type PendingWakeUp = Extract<WakeUpItem, { state: 'pending' }>

function pending(id: string, at: number, text: string): PendingWakeUp {
  return { kind: 'wake-up', id, at, text, state: 'pending' }
}

/** The wake-ups that `threeTurn` set, other than the one of the checks. */
const previewWakeUp = pending(
  'wake-up-preview',
  wakeUpTimes.evening,
  wakeUpTexts.preview,
)
const reviewWakeUp = pending(
  'wake-up-review',
  wakeUpTimes.nextMonday,
  wakeUpTexts.review,
)

/** The wake-up of the long text, after the reset of the rate limit. */
const stagingWakeUp = pending(
  'wake-up',
  wakeUpTimes.afterMidnight,
  wakeUpTexts.staging,
)

/** The turn that the wake-up of the checks starts, while it reads them. */
function readingChecks(elapsed: string): ChatItem[] {
  return [
    {
      kind: 'tool',
      id: 'checks-read',
      tool: 'run',
      target: 'gh pr checks 482',
      status: 'running',
    },
    { kind: 'working', id: 'working', elapsed },
  ]
}

/**
 * The end of the turn of the wake-up: a check failed, so the agent read
 * its log, fixed the cause, and pushed the fix.
 */
const fixedChecks: readonly ChatItem[] = [
  done('checks-read', 'gh pr checks 482', '1 failing'),
  done('checks-log', 'gh run view --log-failed'),
  {
    kind: 'tool',
    id: 'checks-edit',
    tool: 'edit',
    target: 'src/app/checkout/AddressForm.tsx',
    detail: '+6 −2',
    status: 'done',
  },
  done('checks-unit', 'npm test -- checkout', '15 passed'),
  done('checks-push', 'git push'),
  {
    kind: 'agent',
    id: 'checks-answer',
    blocks: [
      p(
        'The postcode test failed, because the places proxy gives no postcode for a PO box. The form now keeps the manual postcode field for such an address. I pushed the fix, and the checks of #482 run again.',
      ),
    ],
  },
  {
    kind: 'turn-end',
    id: 'checks-end',
    duration: '2m 4s',
    files: [
      {
        path: 'src/app/checkout/AddressForm.tsx',
        change: 'modified',
        added: 6,
        removed: 2,
      },
    ],
  },
]

/**
 * A turn that Cal started after the turn that set the wake-up. Its tests
 * ran when the time of the wake-up came, so the line joins the turn.
 */
const postcodeTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'postcode-ask',
    text: 'Add a test for an address without a postcode.',
  },
  {
    kind: 'tool',
    id: 'postcode-edit',
    tool: 'edit',
    target: 'tests/checkout/address.test.ts',
    detail: '+12',
    status: 'done',
  },
  done('postcode-test', 'npm test -- checkout', '15 passed'),
]

/**
 * The chats of Address autocomplete after `history`, its finished first
 * turn, and a turn whose agent set wake-ups and ended its reply.
 */
export function wakeUpConversations(history: readonly ChatItem[]) {
  const checks = [...history, ...checksTurn]
  const three = [...history, ...threeTurn]
  const staging = [...history, ...stagingTurn]
  const personal = { type: 'personal', starter: 'cal' } as const
  return {
    'wake-up-pending': [...checks, checksWakeUp({ state: 'pending' })],
    'wake-ups-pending': [
      ...three,
      previewWakeUp,
      checksWakeUp({ state: 'pending' }),
      reviewWakeUp,
    ],
    'wake-up-long': [...staging, stagingWakeUp],
    'wake-up-long-open': [...staging, { ...stagingWakeUp, open: true }],
    'wake-up-fired': [
      ...checks,
      checksWakeUp({ state: 'fired' }),
      ...readingChecks('6s'),
    ],
    'wake-up-fired-ended': [
      ...checks,
      checksWakeUp({ state: 'fired' }),
      ...fixedChecks,
    ],
    'wake-up-during-turn': [
      ...checks,
      ...postcodeTurn,
      checksWakeUp({ state: 'fired', during: true }),
      ...readingChecks('1m 52s'),
    ],
    'wake-up-starting': [...checks, checksWakeUp({ state: 'fired' })],
    'wake-up-reconnect': [
      ...checks,
      missedWakeUp({ kind: 'reconnect', login: personal, agent: 'claude' }),
    ],
    'wake-up-reconnect-org': [
      ...checks,
      missedWakeUp({
        kind: 'reconnect',
        login: { type: 'org' },
        agent: 'claude',
      }),
    ],
    'wake-up-next-message': [...checks, missedWakeUp({ kind: 'next-message' })],
    'wake-up-closed': [...checks, missedWakeUp({ kind: 'session-closed' })],
    'wake-up-archived': [
      ...checks,
      missedWakeUp({ kind: 'archived' }, wakeUpTimes.dayAfterArchive),
    ],
    'wake-up-cancelled': [
      ...checks,
      checksWakeUp({ state: 'cancelled', by: 'priya' }),
    ],
    'wake-up-cancelled-one': [
      ...three,
      checksWakeUp({ state: 'cancelled', by: 'priya' }),
      previewWakeUp,
      reviewWakeUp,
    ],
    'wake-up-cancelled-left': [...checks, checksWakeUp({ state: 'cancelled' })],
  } as const satisfies Record<WakeUpConversationKey, readonly ChatItem[]>
}
